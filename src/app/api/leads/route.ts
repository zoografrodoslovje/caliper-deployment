import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const VALID_SORT_FIELDS = [
  "name",
  "city",
  "industry",
  "emailValid",
  "domainValid",
  "createdAt",
  "updatedAt",
  "facilityType",
  "results",
  "score",
] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );
    const search = searchParams.get("search") || "";
    const industry = searchParams.get("industry") || "";
    const city = searchParams.get("city") || "";
    const emailValid = searchParams.get("emailValid");
    const domainValid = searchParams.get("domainValid");
    const scoreFilter = searchParams.get("scoreFilter");
    const sortBy =
      (searchParams.get("sortBy") as string) || "createdAt";
    const sortOrder =
      (searchParams.get("sortOrder") as string) || "desc";
    const campaignId = searchParams.get("campaignId") || "";

    // Validate sort fields
    const validSortBy = VALID_SORT_FIELDS.includes(sortBy as typeof VALID_SORT_FIELDS[number])
      ? sortBy
      : "createdAt";
    const validSortOrder = sortOrder === "asc" ? "asc" : "desc";

    // Build where clause
    const where: Prisma.LeadWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { dbaName: { contains: search } },
        { email: { contains: search } },
        { domain: { contains: search } },
        { address: { contains: search } },
        { license: { contains: search } },
        { tags: { contains: search } },
        { phone: { contains: search } },
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

    if (scoreFilter) {
      if (scoreFilter === "high") {
        where.score = { gte: 60 };
      } else if (scoreFilter === "medium") {
        where.score = { gte: 40, lt: 60 };
      } else if (scoreFilter === "low") {
        where.score = { lt: 40 };
      } else if (scoreFilter === "unscored") {
        where.score = 0;
      }
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        orderBy: { [validSortBy]: validSortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids must be a non-empty array" },
        { status: 400 }
      );
    }

    const result = await db.lead.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error("Leads DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete leads" },
      { status: 500 }
    );
  }
}