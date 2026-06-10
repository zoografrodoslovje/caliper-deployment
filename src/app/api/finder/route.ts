import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";

interface EmailPattern {
  name: string;
  format: (first: string, last: string) => string;
  needsLast: boolean;
}

const PATTERNS: EmailPattern[] = [
  { name: "first.last", format: (f, l) => `${f.toLowerCase()}.${l.toLowerCase()}`, needsLast: true },
  { name: "flast", format: (f, l) => `${f.toLowerCase()[0]}${l.toLowerCase()}`, needsLast: true },
  { name: "firstlast", format: (f, l) => `${f.toLowerCase()}${l.toLowerCase()}`, needsLast: true },
  { name: "first", format: (f) => `${f.toLowerCase()}`, needsLast: false },
  { name: "last.first", format: (f, l) => `${l.toLowerCase()}.${f.toLowerCase()}`, needsLast: true },
  { name: "first_last", format: (f, l) => `${f.toLowerCase()}_${l.toLowerCase()}`, needsLast: true },
  { name: "lastfirst", format: (f, l) => `${l.toLowerCase()}${f.toLowerCase()}`, needsLast: true },
  { name: "firstl", format: (f, l) => `${f.toLowerCase()}${l.toLowerCase()[0]}`, needsLast: true },
  { name: "f.last", format: (f, l) => `${f.toLowerCase()[0]}.${l.toLowerCase()}`, needsLast: true },
  { name: "first.d", format: (f, l) => `${f.toLowerCase()}.${l.toLowerCase()[0]}`, needsLast: true },
  { name: "lastf", format: (f, l) => `${l.toLowerCase()}${f.toLowerCase()[0]}`, needsLast: true },
  { name: "first@domain", format: (f) => `${f.toLowerCase()}`, needsLast: false },
];

const HIGH_CONFIDENCE = new Set(["first.last", "flast", "firstlast"]);
const MEDIUM_CONFIDENCE = new Set(["last.first", "lastfirst", "first@domain"]);

function getConfidence(patternName: string): "high" | "medium" | "low" {
  if (HIGH_CONFIDENCE.has(patternName)) return "high";
  if (MEDIUM_CONFIDENCE.has(patternName)) return "medium";
  return "low";
}

interface Prediction {
  email: string;
  pattern: string;
  confidence: "high" | "medium" | "low";
}

function predictEmails(
  firstName: string,
  lastName: string,
  domain: string
): Prediction[] {
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .toLowerCase();

  const predictions: Prediction[] = [];
  const seen = new Set<string>();

  for (const pattern of PATTERNS) {
    if (pattern.needsLast && !lastName.trim()) continue;

    const localPart = pattern.format(
      firstName.trim(),
      lastName.trim()
    );
    const email = `${localPart}@${cleanDomain}`;

    if (!seen.has(email)) {
      seen.add(email);
      predictions.push({
        email,
        pattern: pattern.name,
        confidence: getConfidence(pattern.name),
      });
    }
  }

  return predictions;
}

async function validateDomainBasic(domain: string): Promise<{
  valid: boolean;
  hasMx: boolean;
  hasA: boolean;
}> {
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .toLowerCase();

  let hasMx = false;
  let hasA = false;

  try {
    const mxRecords = await dns.resolveMx(cleanDomain);
    hasMx = mxRecords.length > 0;
  } catch {
    // No MX records
  }

  try {
    const aRecords = await dns.resolve4(cleanDomain);
    hasA = aRecords.length > 0;
  } catch {
    // No A records
  }

  return { valid: hasMx || hasA, hasMx, hasA };
}

interface BulkLeadInput {
  firstName: string;
  lastName: string;
  domain: string;
  id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    if (action === "predict") {
      const { domain, firstName, lastName } = body as {
        domain: string;
        firstName: string;
        lastName: string;
      };

      if (!domain || !firstName.trim()) {
        return NextResponse.json(
          { error: "domain and firstName are required" },
          { status: 400 }
        );
      }

      // Basic domain format check
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(domain)) {
        return NextResponse.json(
          { error: "Invalid domain format" },
          { status: 400 }
        );
      }

      const cleanedDomain = domain
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .replace(/^www\./, "")
        .toLowerCase();

      // DNS check (non-blocking - return predictions even if DNS check fails)
      let domainStatus: { valid: boolean; hasMx: boolean; hasA: boolean } | null = null;
      try {
        domainStatus = await validateDomainBasic(cleanedDomain);
      } catch {
        domainStatus = null;
      }

      const predictions = predictEmails(
        firstName,
        lastName || "",
        cleanedDomain
      );

      return NextResponse.json({
        success: true,
        domain: cleanedDomain,
        domainValid: domainStatus?.valid ?? null,
        domainDetails: domainStatus,
        predictions,
        totalPatterns: predictions.length,
      });
    }

    if (action === "bulk_predict") {
      const { leads } = body as { leads: BulkLeadInput[] };

      if (!Array.isArray(leads) || leads.length === 0) {
        return NextResponse.json(
          { error: "leads must be a non-empty array" },
          { status: 400 }
        );
      }

      if (leads.length > 100) {
        return NextResponse.json(
          { error: "Maximum 100 leads per bulk request" },
          { status: 400 }
        );
      }

      const results: Array<{
        id?: string;
        firstName: string;
        lastName: string;
        domain: string;
        predictions: Prediction[];
        totalPatterns: number;
      }> = [];

      for (const lead of leads) {
        if (!lead.firstName?.trim() || !lead.domain?.trim()) continue;

        const predictions = predictEmails(
          lead.firstName,
          lead.lastName || "",
          lead.domain
        );

        results.push({
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName || "",
          domain: lead.domain,
          predictions,
          totalPatterns: predictions.length,
        });
      }

      return NextResponse.json({
        success: true,
        totalProcessed: results.length,
        results,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Must be 'predict' or 'bulk_predict'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Finder error:", error);
    const message =
      error instanceof Error ? error.message : "Prediction failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
