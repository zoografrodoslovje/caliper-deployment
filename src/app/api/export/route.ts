import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const CSV_HEADERS = [
  "Name",
  "DBA Name",
  "Address",
  "City",
  "State",
  "Zipcode",
  "License",
  "Facility Type",
  "Risk",
  "Inspection Date",
  "Inspection Type",
  "Results",
  "Violations",
  "Latitude",
  "Longitude",
  "Website",
  "Email",
  "Phone",
  "Industry",
  "Description",
  "Country",
  "Domain",
  "LinkedIn",
  "Email Valid",
  "Domain Valid",
  "MX Valid",
  "Source",
  "Created At",
  "Tags",
  "Notes",
  "Score",
];

function escapeCSV(value: string | null | undefined | boolean): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Support format parameter: csv (default) or json
    const format = (searchParams.get("format") || "csv").toLowerCase();
    const search = searchParams.get("search") || "";
    const industry = searchParams.get("industry") || "";
    const city = searchParams.get("city") || "";
    const emailValid = searchParams.get("emailValid");
    const domainValid = searchParams.get("domainValid");
    const campaignId = searchParams.get("campaignId") || "";

    // Build where clause (same logic as leads GET)
    const where: Prisma.LeadWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { dbaName: { contains: search } },
        { email: { contains: search } },
        { domain: { contains: search } },
        { address: { contains: search } },
        { license: { contains: search } },
      ];
    }

    if (industry) {
      where.industry = industry;
    }

    if (city) {
      where.city = city;
    }

    if (emailValid !== null && emailValid !== undefined && emailValid !== "") {
      where.emailValid = emailValid === "true";
    }

    if (domainValid !== null && domainValid !== undefined && domainValid !== "") {
      where.domainValid = domainValid === "true";
    }

    if (campaignId) {
      where.campaignId = campaignId;
    }

    // Fetch all matching leads (no pagination for export)
    const leads = await db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50000, // Safety limit
    });

    // Build CSV
    const rows: string[] = [];
    rows.push(CSV_HEADERS.join(","));

    for (const lead of leads) {
      rows.push(
        [
          escapeCSV(lead.name),
          escapeCSV(lead.dbaName),
          escapeCSV(lead.address),
          escapeCSV(lead.city),
          escapeCSV(lead.state),
          escapeCSV(lead.zipcode),
          escapeCSV(lead.license),
          escapeCSV(lead.facilityType),
          escapeCSV(lead.risk),
          escapeCSV(lead.inspectionDate),
          escapeCSV(lead.inspectionType),
          escapeCSV(lead.results),
          escapeCSV(lead.violations),
          escapeCSV(lead.latitude),
          escapeCSV(lead.longitude),
          escapeCSV(lead.website),
          escapeCSV(lead.email),
          escapeCSV(lead.phone),
          escapeCSV(lead.industry),
          escapeCSV(lead.description),
          escapeCSV(lead.country),
          escapeCSV(lead.domain),
          escapeCSV(lead.linkedin),
          escapeCSV(lead.emailValid),
          escapeCSV(lead.domainValid),
          escapeCSV(lead.mxValid),
          escapeCSV(lead.source),
          escapeCSV(lead.createdAt?.toISOString()),
          escapeCSV(lead.tags),
          escapeCSV(lead.notes),
          escapeCSV(lead.score),
        ].join(",")
      );
    }

    const timestamp = new Date().toISOString().split("T")[0];

    // JSON export format
    if (format === "json") {
      const jsonData = leads.map((lead) => ({
        name: lead.name,
        dbaName: lead.dbaName,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zipcode: lead.zipcode,
        license: lead.license,
        facilityType: lead.facilityType,
        risk: lead.risk,
        inspectionDate: lead.inspectionDate,
        inspectionType: lead.inspectionType,
        results: lead.results,
        violations: lead.violations,
        latitude: lead.latitude,
        longitude: lead.longitude,
        website: lead.website,
        email: lead.email,
        phone: lead.phone,
        industry: lead.industry,
        description: lead.description,
        country: lead.country,
        domain: lead.domain,
        linkedin: lead.linkedin,
        emailValid: lead.emailValid,
        domainValid: lead.domainValid,
        mxValid: lead.mxValid,
        source: lead.source,
        tags: lead.tags,
        notes: lead.notes,
        score: lead.score,
        createdAt: lead.createdAt?.toISOString(),
        updatedAt: lead.updatedAt?.toISOString(),
      }));

      const json = JSON.stringify(jsonData, null, 2);
      const filename = `leadharvester-export-${timestamp}.json`;
      return new NextResponse(json, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // CSV export format (default)
    const csv = rows.join("\n");
    const filename = `leadharvester-export-${timestamp}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export GET error:", error);
    return NextResponse.json(
      { error: "Failed to export leads" },
      { status: 500 }
    );
  }
}