import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Column-name → Lead-field fuzzy mapping
// ---------------------------------------------------------------------------

const COLUMN_ALIASES: Record<string, string> = {
  name: "name",
  "business name": "name",
  company: "name",
  "legal name": "name",
  business: "name",
  organization: "name",
  org: "name",
  entity: "name",
  facility: "name",
  dba: "dbaName",
  "dba name": "dbaName",
  "doing business as": "dbaName",
  "trade name": "dbaName",
  email: "email",
  "e-mail": "email",
  "email address": "email",
  email_address: "email",
  "contact email": "email",
  mail: "email",
  "work email": "email",
  city: "city",
  state: "state",
  "state/province": "state",
  province: "state",
  region: "state",
  address: "address",
  street: "address",
  "street address": "address",
  location: "address",
  "full address": "address",
  "physical address": "address",
  "mailing address": "address",
  phone: "phone",
  telephone: "phone",
  tel: "phone",
  "phone number": "phone",
  "telephone number": "phone",
  "work phone": "phone",
  mobile: "phone",
  cell: "phone",
  "contact number": "phone",
  website: "website",
  web: "website",
  url: "website",
  "web site": "website",
  homepage: "website",
  site: "website",
  "web address": "website",
  industry: "industry",
  category: "industry",
  type: "industry",
  "business type": "industry",
  business_type: "industry",
  sector: "industry",
  segment: "industry",
  "facility type": "facilityType",
  facility_type: "facilityType",
  facilitytype: "facilityType",
  zip: "zipcode",
  zipcode: "zipcode",
  "zip code": "zipcode",
  zip_code: "zipcode",
  postal: "zipcode",
  "postal code": "zipcode",
  postcode: "zipcode",
  postal_code: "zipcode",
  domain: "domain",
  "website domain": "domain",
  "email domain": "domain",
  linkedin: "linkedin",
  "linkedin url": "linkedin",
  linkedin_url: "linkedin",
  "linkedin profile": "linkedin",
  country: "country",
  nation: "country",
  description: "description",
  desc: "description",
  notes: "description",
  note: "description",
  comment: "description",
  comments: "description",
  summary: "description",
  about: "description",
  license: "license",
  "license number": "license",
  license_number: "license",
  lic: "license",
  licence: "license",
  risk: "risk",
  "risk level": "risk",
  risk_level: "risk",
  "risk rating": "risk",
  "inspection date": "inspectionDate",
  inspection_date: "inspectionDate",
  inspectiondate: "inspectionDate",
  "inspected at": "inspectionDate",
  "inspection type": "inspectionType",
  inspection_type: "inspectionType",
  inspectiontype: "inspectionType",
  results: "results",
  result: "results",
  outcome: "results",
  status: "results",
  violations: "violations",
  violation: "violations",
  "violation count": "violations",
  violation_count: "violations",
  "num violations": "violations",
  lat: "latitude",
  latitude: "latitude",
  lng: "longitude",
  lon: "longitude",
  long: "longitude",
  "external id": "externalId",
  external_id: "externalId",
  externalid: "externalId",
  id: "externalId",
};

/**
 * Normalise a header for fuzzy matching: lowercase, trim, collapse whitespace / separators.
 */
function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_\-./]+/g, " ");
}

/**
 * Find the matching Lead field for a given CSV header using alias lookup
 * then longest-substring containment fallback.
 */
function mapColumn(header: string): string | null {
  const norm = normaliseHeader(header);

  // 1. Direct alias match
  if (COLUMN_ALIASES[norm]) return COLUMN_ALIASES[norm];

  // 2. Sub-string / containment match (longest alias match wins)
  let bestMatch: string | null = null;
  let bestLen = 0;
  for (const [alias, field] of Object.entries(COLUMN_ALIASES)) {
    if (norm.includes(alias) || alias.includes(norm)) {
      const len = alias.length;
      if (len > bestLen) {
        bestLen = len;
        bestMatch = field;
      }
    }
  }
  return bestMatch;
}

// ---------------------------------------------------------------------------
// Industry classification heuristics
// ---------------------------------------------------------------------------

const INDUSTRY_KEYWORDS: [string[], string][] = [
  [
    [
      "restaurant", "cafe", "caf\u00e9", "diner", "bistro", "eatery",
      "food service", "catering", "bakery", "pizzeria", "deli",
      "food truck", "barbecue", "grill", "steakhouse", "sushi",
      "taqueria", "food hall", "cafeteria", "commissary", "kitchen",
    ],
    "Restaurant & Food Service",
  ],
  [
    [
      "healthcare", "hospital", "clinic", "medical", "dental",
      "pharmacy", "physician", "nursing", "urgent care", "health",
      "rehab", "therapy", "surgery", "orthopedic", "cardiology",
      "oncology", "pediatric", "veterinary", "animal hospital",
      "mental health", "behavioral health", "home health", "hospice",
      "assisted living", "senior living", "nursing home",
    ],
    "Healthcare",
  ],
  [
    [
      "construction", "contractor", "builder", "roofing", "plumbing",
      "electrical", "hvac", "excavation", "demolition", "remodeling",
      "renovation", "general contractor", "subcontractor", "framing",
      "masonry", "concrete", "carpentry",
    ],
    "Construction",
  ],
  [
    [
      "retail", "store", "shop", "boutique", "mall", "grocery",
      "supermarket", "market", "convenience store", "liquor store",
      "tobacco", "gas station",
    ],
    "Retail",
  ],
  [
    [
      "technology", "software", "tech", "it ", "information technology",
      "saas", "cloud", "cybersecurity", "data", "ai ", "machine learning",
      "startup", "digital", "app ", "platform",
    ],
    "Technology",
  ],
  [
    [
      "real estate", "realtor", "property", "housing", "apartment",
      "rental", "leasing", "landlord", "property management", "development",
    ],
    "Real Estate",
  ],
  [
    [
      "education", "school", "university", "college", "academy", "training",
      "tutoring", "learning", "institute", "charter school", "preschool",
      "daycare", "childcare", "k-12", "montessori",
    ],
    "Education",
  ],
  [
    [
      "manufacturing", "factory", "production", "assembly", "fabrication",
      "processing", "plant", "warehouse", "distribution",
    ],
    "Manufacturing",
  ],
  [
    [
      "legal", "law", "attorney", "lawyer", "law firm", "litigation",
      "paralegal", "notary", "esquire",
    ],
    "Legal",
  ],
  [
    [
      "finance", "financial", "accounting", "bank", "credit", "insurance",
      "investment", "wealth", "tax", "audit", "bookkeeping", "payroll",
      "mortgage", "lending", "loan",
    ],
    "Finance & Insurance",
  ],
  [
    [
      "automotive", "auto", "car", "dealership", "mechanic", "collision",
      "repair shop", "tire", "transmission", "body shop", "garage",
    ],
    "Automotive",
  ],
  [
    [
      "beauty", "salon", "spa", "cosmetology", "barber", "hair", "nail",
      "esthetician", "massage", "wellness", "grooming", "tattoo", "piercing",
    ],
    "Beauty & Personal Care",
  ],
  [
    [
      "logistics", "transportation", "trucking", "freight", "shipping",
      "courier", "delivery", "moving", "cargo", "fleet", "supply chain",
    ],
    "Logistics & Transportation",
  ],
  [
    [
      "agriculture", "farm", "ranch", "agricultural", "crop", "livestock",
      "dairy", "nursery", "landscape", "gardening", "greenhouse",
      "vineyard", "orchard",
    ],
    "Agriculture",
  ],
  [
    [
      "entertainment", "gaming", "casino", "nightclub", "theater", "theatre",
      "music", "venue", "event", "amusement", "bowling", "arcade",
    ],
    "Entertainment",
  ],
  [
    [
      "hotel", "motel", "lodging", "hospitality", "inn", "resort",
      "bed and breakfast", "bnb", "hostel", "accommodation", "travel",
      "tourism",
    ],
    "Hospitality & Tourism",
  ],
  [
    [
      "government", "agency", "federal", "state government", "county",
      "municipal", "city government", "public", "regulatory",
    ],
    "Government",
  ],
  [
    [
      "nonprofit", "non-profit", "charity", "foundation", "ngo", "501(c)",
      "not-for-profit", "social services",
    ],
    "Non-Profit",
  ],
  [
    [
      "mining", "oil", "gas ", "petroleum", "energy", "drilling",
      "refinery", "pipeline", "solar", "wind", "renewable", "utility",
      "utilities", "power",
    ],
    "Energy & Mining",
  ],
];

function classifyIndustry(
  name: string,
  description: string
): string | null {
  const corpus = `${name} ${description}`.toLowerCase();
  for (const [keywords, industry] of INDUSTRY_KEYWORDS) {
    for (const kw of keywords) {
      if (corpus.includes(kw.toLowerCase())) return industry;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Domain extraction helpers
// ---------------------------------------------------------------------------

function extractDomainFromUrl(url: string): string | null {
  try {
    let cleaned = url.trim();
    cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/i, "");
    const domain = cleaned.split(/[/:]/)[0].toLowerCase();
    if (domain.includes(".")) return domain;
    return null;
  } catch {
    return null;
  }
}

function extractDomainFromEmail(email: string): string | null {
  const match = email.trim().match(/@([\w.-]+\.[a-z]{2,})$/i);
  return match ? match[1].toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// CSV Parser – no external dependencies
// ---------------------------------------------------------------------------

function detectDelimiter(firstLine: string): string {
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0, "|": 0 };
  for (const ch of firstLine) {
    if (ch in counts) counts[ch]++;
  }
  let best = ",";
  let max = 0;
  for (const [ch, c] of Object.entries(counts)) {
    if (c > max) {
      max = c;
      best = ch;
    }
  }
  return best;
}

/**
 * Parse CSV text into { headers: string[], rows: Record<string, string>[] }
 *
 * Handles quoted fields, escaped double-quotes (""), newlines inside quoted
 * fields, BOM characters, and auto-detects the delimiter.
 */
function parseCsv(raw: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  // Strip BOM
  let text = raw.replace(/^\uFEFF/, "");

  // --- Phase 1: split into logical lines, respecting quoted fields ---
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          current += '"';
          i++; // skip second quote of escaped pair
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === "\r" && next === "\n") {
        lines.push(current);
        current = "";
        i++; // skip \n
      } else if (ch === "\n" || ch === "\r") {
        lines.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  if (current.trim() !== "" || text.endsWith("\n")) {
    lines.push(current);
  }

  if (lines.length < 2) return { headers: [], rows: [] };

  // --- Phase 2: detect delimiter & split each line into fields ---
  const delimiter = detectDelimiter(lines[0]);

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let field = "";
    let inQ = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];

      if (inQ) {
        if (ch === '"') {
          if (next === '"') {
            field += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQ = true;
        } else if (ch === delimiter) {
          fields.push(field.trim());
          field = "";
        } else {
          field += ch;
        }
      }
    }
    fields.push(field.trim());
    return fields;
  }

  const headers = splitLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const values = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Deterministic externalId from name + email (MD5 prefix)
// ---------------------------------------------------------------------------

function generateExternalId(name: string, email: string): string {
  const payload = `csv:${(name || "").trim().toLowerCase()}:${(email || "")
    .trim()
    .toLowerCase()}`;
  return createHash("md5").update(payload).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IMPORT_SOURCE = "csv_import";

// The Lead model fields we are willing to write from CSV data
const MUTABLE_LEAD_FIELDS = [
  "name",
  "dbaName",
  "address",
  "city",
  "state",
  "zipcode",
  "phone",
  "website",
  "email",
  "industry",
  "description",
  "country",
  "domain",
  "linkedin",
  "license",
  "facilityType",
  "risk",
  "inspectionDate",
  "inspectionType",
  "results",
  "violations",
  "latitude",
  "longitude",
] as const;

type MutableLeadField = (typeof MUTABLE_LEAD_FIELDS)[number];

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // ---- 1. Read CSV content from FormData or JSON body ----
    let csvText = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const csvField = formData.get("csv") as string | null;

      if (file) {
        csvText = await file.text();
      } else if (csvField) {
        csvText = csvField;
      } else {
        return NextResponse.json(
          { error: "No 'file' or 'csv' field found in FormData" },
          { status: 400 }
        );
      }
    } else {
      // Assume JSON
      const body = (await request.json()) as { csv?: string };
      if (!body.csv || typeof body.csv !== "string") {
        return NextResponse.json(
          { error: "Request body must contain a 'csv' string field" },
          { status: 400 }
        );
      }
      csvText = body.csv;
    }

    // ---- 2. Parse CSV ----
    const { headers, rows } = parseCsv(csvText);

    if (headers.length === 0) {
      return NextResponse.json(
        { error: "CSV appears empty or could not be parsed" },
        { status: 400 }
      );
    }

    // ---- 3. Map CSV columns to Lead model fields ----
    const columnsMapped: Record<string, string> = {};
    const headerToField: Record<number, MutableLeadField | "externalId"> = {};

    headers.forEach((h, idx) => {
      const field = mapColumn(h);
      if (field) {
        columnsMapped[h] = field;
        // only store writable fields
        if (
          field === "externalId" ||
          (MUTABLE_LEAD_FIELDS as readonly string[]).includes(field)
        ) {
          headerToField[idx] = field as MutableLeadField | "externalId";
        }
      }
    });

    // Require at least name to be mappable
    if (!("name" in columnsMapped)) {
      return NextResponse.json(
        {
          error:
            "Could not find a 'name' column in CSV. Mapped columns: " +
            JSON.stringify(columnsMapped),
        },
        { status: 400 }
      );
    }

    // ---- 4. Process each row ----
    let imported = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (let ri = 0; ri < rows.length; ri++) {
      const rawRow = rows[ri];
      const rowNumber = ri + 2; // 1-based, +1 for header row

      // Build mapped field → value
      const mapped: Record<string, string> = {};
      for (const [idxStr, field] of Object.entries(headerToField)) {
        const csvHeader = headers[Number(idxStr)];
        mapped[field] = (rawRow[csvHeader] || "").trim();
      }

      // Validate: name is required
      if (!mapped.name) {
        errors.push({ row: rowNumber, message: "Required field 'name' is empty" });
        skipped++;
        continue;
      }

      // Auto-generate externalId when not supplied
      if (!mapped.externalId) {
        mapped.externalId = generateExternalId(mapped.name, mapped.email || "");
      }

      // Auto-extract domain from website or email if missing
      if (!mapped.domain) {
        if (mapped.website) {
          const d = extractDomainFromUrl(mapped.website);
          if (d) mapped.domain = d;
        }
        if (!mapped.domain && mapped.email) {
          const d = extractDomainFromEmail(mapped.email);
          if (d) mapped.domain = d;
        }
      }

      // Auto-classify industry if missing
      if (!mapped.industry) {
        mapped.industry =
          classifyIndustry(mapped.name, mapped.description || "") || "";
      }

      // ---- Upsert ----
      try {
        const existing = await db.lead.findUnique({
          where: {
            externalId_source: {
              externalId: mapped.externalId,
              source: IMPORT_SOURCE,
            },
          },
        });

        if (existing) {
          // Update only non-empty changed fields
          const updateData: Record<string, string> = {};
          for (const f of MUTABLE_LEAD_FIELDS) {
            if (mapped[f] && mapped[f] !== (existing as Record<string, unknown>)[f]) {
              updateData[f] = mapped[f];
            }
          }

          if (Object.keys(updateData).length > 0) {
            await db.lead.update({
              where: { id: existing.id },
              data: updateData,
            });
            imported++;
          } else {
            skipped++;
          }
        } else {
          // Create
          const createData: Record<string, string> = {
            externalId: mapped.externalId,
            name: mapped.name,
            source: IMPORT_SOURCE,
          };

          for (const f of MUTABLE_LEAD_FIELDS) {
            if (mapped[f]) createData[f] = mapped[f];
          }

          await db.lead.create({ data: createData as unknown as Prisma.LeadUncheckedCreateInput });
          imported++;
        }
      } catch (dbError) {
        const msg =
          dbError instanceof Error ? dbError.message : "Unknown database error";
        errors.push({ row: rowNumber, message: `Database error: ${msg}` });
        skipped++;
      }
    }

    // ---- 5. Return import summary ----
    return NextResponse.json({
      success: true,
      total: rows.length,
      imported,
      skipped,
      errors,
      columnsMapped,
    });
  } catch (error) {
    console.error("CSV Import error:", error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json(
      { error: `Import failed: ${message}` },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// OPTIONS – CORS preflight support
// ---------------------------------------------------------------------------
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
