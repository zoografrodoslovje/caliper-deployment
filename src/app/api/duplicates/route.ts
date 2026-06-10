import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface DuplicateGroup {
  id: string;
  leads: Record<string, unknown>[];
  matchType: string;
  matchField: string;
  matchValue: string;
  confidence: number;
}

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/[\s\-_.]+/g, "");
}

function extractDomain(email: string): string {
  const parts = email.split("@");
  return parts.length > 1 ? parts[1].toLowerCase().trim() : "";
}

function areSimilar(a: string, b: string, threshold: number = 0.85): boolean {
  if (!a || !b) return false;
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.length < 2 || nb.length < 2) return false;

  // Levenshtein-like similarity via bigrams
  const bigramsA = new Set<string>();
  const bigramsB = new Set<string>();
  for (let i = 0; i < na.length - 1; i++) bigramsA.add(na.substring(i, i + 2));
  for (let i = 0; i < nb.length - 1; i++) bigramsB.add(nb.substring(i, i + 2));

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  const union = bigramsA.size + bigramsB.size - intersection;
  return union > 0 ? intersection / union >= threshold : false;
}

function scanDuplicates(leads: Record<string, unknown>[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const grouped = new Set<string>();

  // Build indexes
  const byName: Map<string, Record<string, unknown>[]> = new Map();
  const byEmail: Map<string, Record<string, unknown>[]> = new Map();
  const byDomain: Map<string, Record<string, unknown>[]> = new Map();
  const byPhone: Map<string, Record<string, unknown>[]> = new Map();

  for (const lead of leads) {
    const name = String(lead.name || "").trim();
    const email = String(lead.email || "").trim();
    const domain = String(lead.domain || "").trim();
    const phone = String(lead.phone || "").trim();

    if (name) {
      const key = normalize(name);
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(lead);
    }
    if (email) {
      const key = email.toLowerCase().trim();
      if (!byEmail.has(key)) byEmail.set(key, []);
      byEmail.get(key)!.push(lead);
    }
    if (domain) {
      const key = domain.toLowerCase().trim();
      if (!byDomain.has(key)) byDomain.set(key, []);
      byDomain.get(key)!.push(lead);
    }
    if (phone) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length >= 7) {
        const key = digits.length > 10 ? digits.slice(-10) : digits;
        if (!byPhone.has(key)) byPhone.set(key, []);
        byPhone.get(key)!.push(lead);
      }
    }
  }

  // 1. Exact name matches
  for (const [nameKey, matching] of byName) {
    if (matching.length > 1 && !grouped.has(nameKey)) {
      const ids = matching.map((l) => String(l.id));
      if (ids.every((id) => !grouped.has(id))) {
        ids.forEach((id) => grouped.add(id));
        groups.push({
          id: `name-${groups.length}`,
          leads: matching,
          matchType: "Name",
          matchField: "name",
          matchValue: String(matching[0].name),
          confidence: 1.0,
        });
      }
    }
  }

  // 2. Exact email matches
  for (const [emailKey, matching] of byEmail) {
    if (matching.length > 1) {
      const ids = matching.map((l) => String(l.id));
      const allUngrouped = ids.every((id) => !grouped.has(id));
      if (allUngrouped) {
        ids.forEach((id) => grouped.add(id));
        groups.push({
          id: `email-${groups.length}`,
          leads: matching,
          matchType: "Email",
          matchField: "email",
          matchValue: String(matching[0].email),
          confidence: 1.0,
        });
      }
    }
  }

  // 3. Domain matches
  for (const [domainKey, matching] of byDomain) {
    if (matching.length > 1) {
      const ids = matching.map((l) => String(l.id));
      const allUngrouped = ids.every((id) => !grouped.has(id));
      if (allUngrouped) {
        ids.forEach((id) => grouped.add(id));
        groups.push({
          id: `domain-${groups.length}`,
          leads: matching,
          matchType: "Domain",
          matchField: "domain",
          matchValue: String(matching[0].domain),
          confidence: 0.9,
        });
      }
    }
  }

  // 4. Phone matches
  for (const [phoneKey, matching] of byPhone) {
    if (matching.length > 1) {
      const ids = matching.map((l) => String(l.id));
      const allUngrouped = ids.every((id) => !grouped.has(id));
      if (allUngrouped) {
        ids.forEach((id) => grouped.add(id));
        groups.push({
          id: `phone-${groups.length}`,
          leads: matching,
          matchType: "Phone",
          matchField: "phone",
          matchValue: String(matching[0].phone),
          confidence: 0.85,
        });
      }
    }
  }

  // 5. Fuzzy name similarity (catches typos / slight variations)
  const ungroupedLeads = leads.filter((l) => !grouped.has(String(l.id)));
  for (let i = 0; i < ungroupedLeads.length; i++) {
    const a = ungroupedLeads[i];
    const nameA = String(a.name || "").trim();
    if (!nameA) continue;

    const cluster: Record<string, unknown>[] = [a];
    for (let j = i + 1; j < ungroupedLeads.length; j++) {
      const b = ungroupedLeads[j];
      const nameB = String(b.name || "").trim();
      if (areSimilar(nameA, nameB, 0.75)) {
        cluster.push(b);
      }
    }

    if (cluster.length > 1) {
      const ids = cluster.map((l) => String(l.id));
      ids.forEach((id) => grouped.add(id));
      groups.push({
        id: `fuzzy-name-${groups.length}`,
        leads: cluster,
        matchType: "Similar Name",
        matchField: "name",
        matchValue: nameA,
        confidence: 0.75,
      });
    }
  }

  // 6. Same email domain (different local parts but same organization)
  const emailLeads = leads.filter(
    (l) => String(l.email || "").includes("@") && !grouped.has(String(l.id))
  );
  const domainGroup: Map<string, Record<string, unknown>[]> = new Map();
  for (const lead of emailLeads) {
    const email = String(lead.email);
    const d = extractDomain(email);
    if (!d) continue;
    if (!domainGroup.has(d)) domainGroup.set(d, []);
    domainGroup.get(d)!.push(lead);
  }
  for (const [d, matching] of domainGroup) {
    if (matching.length > 1) {
      const ids = matching.map((l) => String(l.id));
      const allUngrouped = ids.every((id) => !grouped.has(id));
      if (allUngrouped) {
        ids.forEach((id) => grouped.add(id));
        groups.push({
          id: `email-domain-${groups.length}`,
          leads: matching,
          matchType: "Email Domain",
          matchField: "email",
          matchValue: d,
          confidence: 0.6,
        });
      }
    }
  }

  return groups;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action || !["find", "merge"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'find' or 'merge'." },
        { status: 400 }
      );
    }

    if (action === "find") {
      const leads = await db.lead.findMany();
      const plainLeads = leads.map((l) => ({ ...l, createdAt: String(l.createdAt), updatedAt: String(l.updatedAt), emailCheckedAt: l.emailCheckedAt ? String(l.emailCheckedAt) : null, domainCheckedAt: l.domainCheckedAt ? String(l.domainCheckedAt) : null }));
      const groups = scanDuplicates(plainLeads);
      return NextResponse.json({
        success: true,
        totalLeads: leads.length,
        duplicateGroups: groups.length,
        duplicates: groups,
      });
    }

    if (action === "merge") {
      const { keepId, mergeIds } = body as { keepId: string; mergeIds: string[] };

      if (!keepId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "keepId and non-empty mergeIds array are required" },
          { status: 400 }
        );
      }

      if (mergeIds.includes(keepId)) {
        return NextResponse.json(
          { success: false, error: "keepId must not be in mergeIds" },
          { status: 400 }
        );
      }

      // Fetch all leads involved
      const keepLead = await db.lead.findUnique({ where: { id: keepId } });
      const mergeLeads = await db.lead.findMany({ where: { id: { in: mergeIds } } });

      if (!keepLead) {
        return NextResponse.json(
          { success: false, error: `Lead with id '${keepId}' not found` },
          { status: 404 }
        );
      }

      if (mergeLeads.length === 0) {
        return NextResponse.json(
          { success: false, error: "No merge leads found" },
          { status: 404 }
        );
      }

      // Merge: keep the best data from each lead
      const updateData: Record<string, unknown> = {};

      // Merge tags
      const allTags = new Set<string>();
      for (const tag of (keepLead.tags || "").split(",").filter(Boolean)) allTags.add(tag.trim());
      for (const lead of mergeLeads) {
        for (const tag of (lead.tags || "").split(",").filter(Boolean)) allTags.add(tag.trim());
      }
      if (allTags.size > 0) {
        updateData.tags = [...allTags].join(",");
      }

      // Merge notes (concatenate with separator)
      const allNotes: string[] = [];
      if (keepLead.notes) allNotes.push(keepLead.notes);
      for (const lead of mergeLeads) {
        if (lead.notes && !allNotes.includes(lead.notes)) {
          allNotes.push(`[${lead.name}]: ${lead.notes}`);
        }
      }
      if (allNotes.length > 1) {
        updateData.notes = allNotes.join("\n---\n");
      }

      // Keep the best score
      const bestScore = Math.max(
        keepLead.score,
        ...mergeLeads.map((l) => l.score)
      );
      if (bestScore > keepLead.score) {
        updateData.score = bestScore;
      }

      // Fill empty fields from merge leads
      type LeadField = keyof typeof keepLead;
      const mergeableFields: LeadField[] = [
        "email", "phone", "website", "domain", "linkedin",
        "description", "address", "city", "state", "zipcode",
        "industry", "country",
      ] as LeadField[];

      for (const field of mergeableFields) {
        if (!keepLead[field] || String(keepLead[field]).trim() === "") {
          for (const lead of mergeLeads) {
            if (lead[field] && String(lead[field]).trim() !== "") {
              updateData[field] = lead[field];
              break;
            }
          }
        }
      }

      // Update the kept lead
      await db.lead.update({
        where: { id: keepId },
        data: updateData,
      });

      // Delete merged leads
      const deleteResult = await db.lead.deleteMany({
        where: { id: { in: mergeIds } },
      });

      return NextResponse.json({
        success: true,
        keptLeadId: keepId,
        mergedCount: deleteResult.count,
        fieldsUpdated: Object.keys(updateData),
      });
    }

    return NextResponse.json(
      { success: false, error: "Unhandled action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Duplicates API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
