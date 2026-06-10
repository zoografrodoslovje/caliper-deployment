import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const [
      totalLeads,
      validatedEmails,
      validatedDomains,
      industryDistribution,
      cityDistribution,
      recentCampaigns,
      sourceBreakdown,
      validationLogs,
      scoredLeads,
      scoreAgg,
    ] = await Promise.all([
      // Total leads
      db.lead.count(),

      // Validated emails
      db.lead.count({ where: { emailValid: true } }),

      // Validated domains
      db.lead.count({ where: { domainValid: true } }),

      // Industry distribution
      db.lead.groupBy({
        by: ["industry"],
        _count: { industry: true },
        orderBy: { _count: { industry: "desc" } },
      }),

      // City distribution (top 20)
      db.$queryRaw<Array<{ city: string; _count: bigint }>>(
        Prisma.sql`
          SELECT city, COUNT(*) as _count
          FROM Lead
          WHERE city IS NOT NULL AND city != ''
          GROUP BY city
          ORDER BY _count DESC
          LIMIT 20
        `
      ),

      // Recent campaigns
      db.campaign.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Source breakdown
      db.lead.groupBy({
        by: ["source"],
        _count: { source: true },
      }),

      // Total validation logs
      db.validationLog.count(),

      // Leads with score > 0 (i.e., scored leads)
      db.lead.count({ where: { score: { gt: 0 } } }),

      // Average score across all leads
      db.lead.aggregate({ _avg: { score: true } }),
    ]);

    // Calculate quality score
    const leadsWithEmail = await db.lead.count({
      where: { email: { not: "" } },
    });
    const qualityScore =
      totalLeads > 0
        ? Math.round(
            ((validatedEmails + validatedDomains) / (totalLeads * 2)) * 100
          )
        : 0;

    // Calculate today's new leads
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLeads = await db.lead.count({
      where: { createdAt: { gte: today } },
    });

    const avgScore = Math.round(scoreAgg._avg.score ?? 0);

    return NextResponse.json({
      totalLeads,
      validatedEmails,
      validatedDomains,
      scoredLeads,
      avgScore,
      unvalidatedEmails: totalLeads - validatedEmails,
      unvalidatedDomains: totalLeads - validatedDomains,
      leadsWithEmail,
      qualityScore,
      todayLeads,
      totalValidationLogs: validationLogs,
      industryDistribution: industryDistribution.map((item) => ({
        industry: item.industry,
        count: item._count.industry,
      })),
      cityDistribution: cityDistribution.map((item) => ({
        city: item.city,
        count: Number(item._count),
      })),
      sourceBreakdown: sourceBreakdown.map((item) => ({
        source: item.source,
        count: item._count.source,
      })),
      recentCampaigns,
    });
  } catch (error) {
    console.error("Stats GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
