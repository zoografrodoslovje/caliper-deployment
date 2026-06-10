import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type LeadRecord = {
  id: string;
  email: string;
  emailValid: boolean;
  domain: string;
  domainValid: boolean;
  phone: string;
  website: string;
  linkedin: string;
  industry: string;
  address: string;
  city: string;
  state: string;
  risk: string;
};

type Breakdown = {
  base: number;
  hasEmail: number;
  emailValid: number;
  hasDomain: number;
  domainValid: number;
  hasPhone: number;
  hasWebsite: number;
  hasLinkedin: number;
  hasIndustry: number;
  hasFullAddress: number;
  riskPenalty: number;
};

function calculateLeadScore(lead: LeadRecord): { score: number; breakdown: Breakdown } {
  const breakdown: Breakdown = {
    base: 50,
    hasEmail: 0,
    emailValid: 0,
    hasDomain: 0,
    domainValid: 0,
    hasPhone: 0,
    hasWebsite: 0,
    hasLinkedin: 0,
    hasIndustry: 0,
    hasFullAddress: 0,
    riskPenalty: 0,
  };

  // Has email
  if (lead.email && lead.email.trim().length > 0) {
    breakdown.hasEmail = 15;
  }

  // Email is validated
  if (lead.emailValid) {
    breakdown.emailValid = 20;
  }

  // Has domain
  if (lead.domain && lead.domain.trim().length > 0) {
    breakdown.hasDomain = 10;
  }

  // Domain is validated
  if (lead.domainValid) {
    breakdown.domainValid = 15;
  }

  // Has phone
  if (lead.phone && lead.phone.trim().length > 0) {
    breakdown.hasPhone = 5;
  }

  // Has website
  if (lead.website && lead.website.trim().length > 0) {
    breakdown.hasWebsite = 10;
  }

  // Has LinkedIn
  if (lead.linkedin && lead.linkedin.trim().length > 0) {
    breakdown.hasLinkedin = 5;
  }

  // Industry is known
  if (lead.industry && lead.industry.trim().length > 0 && lead.industry !== "Unknown") {
    breakdown.hasIndustry = 5;
  }

  // Has full address (city + state + address all non-empty)
  if (
    lead.address &&
    lead.address.trim().length > 0 &&
    lead.city &&
    lead.city.trim().length > 0 &&
    lead.state &&
    lead.state.trim().length > 0
  ) {
    breakdown.hasFullAddress = 5;
  }

  // Risk penalties
  if (lead.risk === "Risk 1 (Highest)") {
    breakdown.riskPenalty = -10;
  } else if (lead.risk === "Risk 2 (High)") {
    breakdown.riskPenalty = -5;
  }

  const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return { score: Math.max(0, Math.min(100, score)), breakdown };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action || !["calculate", "calculate_all"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'calculate' or 'calculate_all'." },
        { status: 400 }
      );
    }

    if (action === "calculate") {
      const { leadId } = body;

      if (!leadId) {
        return NextResponse.json(
          { success: false, error: "Missing required field: leadId" },
          { status: 400 }
        );
      }

      const lead = await db.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        return NextResponse.json(
          { success: false, error: `Lead with id '${leadId}' not found` },
          { status: 404 }
        );
      }

      const { score, breakdown } = calculateLeadScore(lead);

      await db.lead.update({
        where: { id: leadId },
        data: { score },
      });

      return NextResponse.json({
        success: true,
        leadId,
        score,
        breakdown,
      });
    }

    if (action === "calculate_all") {
      const scores: { leadId: string; score: number }[] = [];
      let skip = 0;
      const batchSize = 200;
      let totalScored = 0;

      while (true) {
        const leads = await db.lead.findMany({
          skip,
          take: batchSize,
        });

        if (leads.length === 0) break;

        await Promise.all(
          leads.map(async (lead) => {
            const { score } = calculateLeadScore(lead);
            scores.push({ leadId: lead.id, score });
            return db.lead.update({
              where: { id: lead.id },
              data: { score },
            });
          })
        );

        totalScored += leads.length;
        skip += batchSize;
      }

      return NextResponse.json({
        success: true,
        totalScored,
        scores,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unhandled action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Score API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
