import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import dns from "dns/promises";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface ValidationResult {
  type: string;
  input: string;
  isValid: boolean;
  details: Record<string, unknown>;
}

async function validateEmail(
  email: string
): Promise<ValidationResult> {
  const details: Record<string, unknown> = {};

  // Syntax check
  const syntaxValid = EMAIL_REGEX.test(email);
  details.syntaxValid = syntaxValid;

  if (!syntaxValid) {
    return {
      type: "email",
      input: email,
      isValid: false,
      details,
    };
  }

  // Extract domain
  const domain = email.split("@")[1];
  details.domain = domain;

  // MX record check
  let mxValid = false;
  try {
    const mxRecords = await dns.resolveMx(domain);
    mxValid = mxRecords.length > 0;
    details.mxRecords = mxRecords.length;
  } catch {
    // No MX records - try A record as fallback
    try {
      const aRecords = await dns.resolve4(domain);
      details.hasARecord = aRecords.length > 0;
      mxValid = false;
    } catch {
      details.hasARecord = false;
    }
  }
  details.mxValid = mxValid;

  // Overall valid if syntax is correct and domain has MX or A records
  let domainResolvable = false;
  try {
    await dns.resolve4(domain);
    domainResolvable = true;
  } catch {
    try {
      await dns.resolve6(domain);
      domainResolvable = true;
    } catch {
      // ignore
    }
  }
  details.domainResolvable = domainResolvable;

  const isValid = syntaxValid && (mxValid || domainResolvable);

  return {
    type: "email",
    input: email,
    isValid,
    details,
  };
}

async function validateDomain(
  domain: string
): Promise<ValidationResult> {
  const details: Record<string, unknown> = {};

  // Clean domain
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
  details.cleanedDomain = cleanDomain;

  // A/AAAA record check
  let hasA = false;
  let hasAAAA = false;
  try {
    const aRecords = await dns.resolve4(cleanDomain);
    hasA = aRecords.length > 0;
    details.aRecords = aRecords.length;
  } catch {
    details.aRecords = 0;
  }

  try {
    const aaaaRecords = await dns.resolve6(cleanDomain);
    hasAAAA = aaaaRecords.length > 0;
    details.aaaaRecords = aaaaRecords.length;
  } catch {
    details.aaaaRecords = 0;
  }

  details.dnsResolvable = hasA || hasAAAA;

  // MX record check
  let mxValid = false;
  try {
    const mxRecords = await dns.resolveMx(cleanDomain);
    mxValid = mxRecords.length > 0;
    details.mxRecords = mxRecords.length;
  } catch {
    details.mxRecords = 0;
  }
  details.mxValid = mxValid;

  const isValid = hasA || hasAAAA;

  return {
    type: "domain",
    input: domain,
    isValid,
    details,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      input,
      leadIds,
    } = body as {
      type: "email" | "domain" | "bulk";
      input?: string | string[];
      leadIds?: string[];
    };

    if (type === "bulk") {
      // Validate all leads that haven't been checked yet
      const unvalidatedLeads = await db.lead.findMany({
        where: {
          OR: [
            { emailCheckedAt: null, email: { not: "" } },
            { domainCheckedAt: null, domain: { not: "" } },
          ],
        },
        take: 500,
      });

      const results: ValidationResult[] = [];
      let emailValidated = 0;
      let domainValidated = 0;

      for (const lead of unvalidatedLeads) {
        // Validate email if not checked and email exists
        if (
          !lead.emailCheckedAt &&
          lead.email &&
          EMAIL_REGEX.test(lead.email)
        ) {
          const emailResult = await validateEmail(lead.email);

          await db.lead.update({
            where: { id: lead.id },
            data: {
              emailValid: emailResult.isValid,
              mxValid: (emailResult.details.mxValid as boolean) || false,
              emailCheckedAt: new Date(),
            },
          });

          await db.validationLog.create({
            data: {
              type: "email",
              input: lead.email,
              isValid: emailResult.isValid,
              details: JSON.stringify(emailResult.details),
            },
          });

          results.push(emailResult);
          emailValidated++;
        }

        // Validate domain if not checked and domain exists
        if (!lead.domainCheckedAt && lead.domain) {
          const domainResult = await validateDomain(lead.domain);

          await db.lead.update({
            where: { id: lead.id },
            data: {
              domainValid: domainResult.isValid,
              domainCheckedAt: new Date(),
            },
          });

          await db.validationLog.create({
            data: {
              type: "domain",
              input: lead.domain,
              isValid: domainResult.isValid,
              details: JSON.stringify(domainResult.details),
            },
          });

          results.push(domainResult);
          domainValidated++;
        }
      }

      return NextResponse.json({
        success: true,
        totalChecked: emailValidated + domainValidated,
        emailValidated,
        domainValidated,
        results: results.slice(0, 100), // Return first 100 for preview
      });
    }

    if (type === "email") {
      if (!input || typeof input !== "string") {
        return NextResponse.json(
          { error: "input must be a string for email validation" },
          { status: 400 }
        );
      }

      const result = await validateEmail(input);

      // Update lead records if leadIds provided
      if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
        await db.lead.updateMany({
          where: { id: { in: leadIds } },
          data: {
            emailValid: result.isValid,
            mxValid: (result.details.mxValid as boolean) || false,
            emailCheckedAt: new Date(),
          },
        });
      }

      // Log validation
      await db.validationLog.create({
        data: {
          type: "email",
          input,
          isValid: result.isValid,
          details: JSON.stringify(result.details),
        },
      });

      return NextResponse.json({ success: true, ...result });
    }

    if (type === "domain") {
      if (!input || typeof input !== "string") {
        return NextResponse.json(
          { error: "input must be a string for domain validation" },
          { status: 400 }
        );
      }

      const result = await validateDomain(input);

      // Update lead records if leadIds provided
      if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
        await db.lead.updateMany({
          where: { id: { in: leadIds } },
          data: {
            domainValid: result.isValid,
            domainCheckedAt: new Date(),
          },
        });
      }

      // Log validation
      await db.validationLog.create({
        data: {
          type: "domain",
          input,
          isValid: result.isValid,
          details: JSON.stringify(result.details),
        },
      });

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { error: "Invalid type. Must be 'email', 'domain', or 'bulk'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Validate error:", error);
    const message =
      error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}