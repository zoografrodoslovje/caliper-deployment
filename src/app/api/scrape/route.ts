import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SOCRATA_URL = "https://data.cityofchicago.org/resource/4ijn-s7e5.json";

const INDUSTRY_MAP: Record<string, string> = {
  restaurant: "Restaurant",
  diner: "Restaurant",
  bistro: "Restaurant",
  cafe: "Cafe/Coffee Shop",
  coffee: "Cafe/Coffee Shop",
  bar: "Bar/Nightlife",
  pub: "Bar/Nightlife",
  brewery: "Bar/Nightlife",
  "food truck": "Food Truck/Stand",
  mobile: "Food Truck/Stand",
  grocery: "Grocery/Market",
  market: "Grocery/Market",
  deli: "Grocery/Market",
  bakery: "Bakery",
  pastry: "Bakery",
  donut: "Bakery",
  "ice cream": "Dessert/Ice Cream",
  dessert: "Dessert/Ice Cream",
  juice: "Juice/Smoothie Bar",
  smoothie: "Juice/Smoothie Bar",
  catering: "Catering",
};

function classifyIndustry(facilityType: string): string {
  if (!facilityType) return "Food Service";
  const lower = facilityType.toLowerCase();
  for (const [keyword, industry] of Object.entries(INDUSTRY_MAP)) {
    if (lower.includes(keyword)) return industry;
  }
  return "Food Service";
}

function extractDomain(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(
      url.startsWith("http") ? url : `https://${url}`
    );
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

interface SocrataRecord {
  license_: string;
  legal_name: string;
  doing_business_as_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  license_description: string;
  facility_type: string;
  risk_level: string;
  inspection_date: string;
  inspection_type: string;
  results: string;
  violations: string;
  latitude: string;
  longitude: string;
  [key: string]: string | null | undefined;
}

async function fetchWithRetry(
  url: string,
  retries = 3
): Promise<SocrataRecord[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-App-Token": process.env.SOCRATA_APP_TOKEN || "",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (res.status === 429 || res.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!res.ok) {
        throw new Error(`Socrata API error: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as SocrataRecord[];
    } catch (error) {
      if (attempt === retries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source = "socrata",
      maxRecords = 5000,
      campaignId: existingCampaignId,
      campaignName,
      filters = {},
    } = body as {
      source?: string;
      maxRecords?: number;
      campaignId?: string;
      campaignName?: string;
      filters?: { city?: string; facilityType?: string };
    };

    // Create or use existing campaign
    let campaignId = existingCampaignId;
    if (!campaignId) {
      const campaign = await db.campaign.create({
        data: {
          name: campaignName || `Scrape ${new Date().toISOString().split("T")[0]}`,
          status: "running",
          source,
          queryFilter: JSON.stringify(filters),
        },
      });
      campaignId = campaign.id;
    } else {
      await db.campaign.update({
        where: { id: campaignId },
        data: { status: "running" },
      });
    }

    const allRecords: SocrataRecord[] = [];
    const pageSize = 500;
    let offset = 0;
    let hasMore = true;

    // Build query filter
    const filterParts: string[] = [];
    if (filters.city) {
      filterParts.push(`city='${encodeURIComponent(filters.city)}'`);
    }
    if (filters.facilityType) {
      filterParts.push(
        `facility_type='${encodeURIComponent(filters.facilityType)}'`
      );
    }
    const whereClause = filterParts.length > 0 ? `&$where=${filterParts.join(" AND ")}` : "";

    while (hasMore && allRecords.length < maxRecords) {
      const url = `${SOCRATA_URL}?$limit=${pageSize}&$offset=${offset}&$order=license_${whereClause}`;
      const records = await fetchWithRetry(url);

      if (records.length === 0) {
        hasMore = false;
        break;
      }

      allRecords.push(...records);
      offset += pageSize;

      if (records.length < pageSize) {
        hasMore = false;
      }
    }

    const recordsToProcess = allRecords.slice(0, maxRecords);
    let saved = 0;

    for (const record of recordsToProcess) {
      const name =
        record.legal_name ||
        record.doing_business_as_name ||
        "Unknown Business";
      const dbaName = record.doing_business_as_name || "";
      const facilityType = record.facility_type || "";
      const email = record.license_description || ""; // Socrata doesn't have email, use as placeholder
      const industry = classifyIndustry(facilityType);
      const domain = "";

      await db.lead.upsert({
        where: {
          externalId_source: {
            externalId: record.license_ || `${offset}-${saved}`,
            source,
          },
        },
        create: {
          externalId: record.license_ || `${offset}-${saved}`,
          name,
          dbaName,
          address: record.address || "",
          city: record.city || "",
          state: record.state || "IL",
          zipcode: record.zip || "",
          license: record.license_ || "",
          facilityType,
          risk: record.risk_level || "",
          inspectionDate: record.inspection_date || "",
          inspectionType: record.inspection_type || "",
          results: record.results || "",
          violations: record.violations || "",
          latitude: record.latitude || "",
          longitude: record.longitude || "",
          website: "",
          email: "",
          phone: "",
          industry,
          description: `${name} - ${facilityType}`,
          country: "US",
          domain,
          source,
          campaignId,
        },
        update: {
          name,
          dbaName,
          address: record.address || "",
          city: record.city || "",
          state: record.state || "IL",
          zipcode: record.zip || "",
          license: record.license_ || "",
          facilityType,
          risk: record.risk_level || "",
          inspectionDate: record.inspection_date || "",
          inspectionType: record.inspection_type || "",
          results: record.results || "",
          violations: record.violations || "",
          latitude: record.latitude || "",
          longitude: record.longitude || "",
          industry,
          description: `${name} - ${facilityType}`,
        },
      });
      saved++;
    }

    // Update campaign
    await db.campaign.update({
      where: { id: campaignId },
      data: {
        status: "completed",
        totalFetched: recordsToProcess.length,
        totalValid: saved,
      },
    });

    return NextResponse.json({
      success: true,
      scraped: recordsToProcess.length,
      saved,
      campaignId,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown scrape error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}