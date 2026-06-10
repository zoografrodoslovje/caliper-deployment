import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    if (!leadId) {
      return NextResponse.json(
        { error: "Missing required query param: leadId" },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { id: true, tags: true, notes: true },
    });

    if (!lead) {
      return NextResponse.json(
        { error: `Lead with id '${leadId}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      leadId: lead.id,
      tags: lead.tags
        ? lead.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      notes: lead.notes || "",
    });
  } catch (error) {
    console.error("Notes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes/tags" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: leadId" },
        { status: 400 }
      );
    }

    const validActions = ["add_tag", "remove_tag", "update_notes"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
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

    if (action === "add_tag") {
      const { tag } = body as { tag: string };
      if (!tag || typeof tag !== "string" || tag.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Missing or invalid field: tag" },
          { status: 400 }
        );
      }

      const normalizedTag = tag.trim().toLowerCase().replace(/\s+/g, "-");
      const currentTags = lead.tags
        ? lead.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      if (currentTags.includes(normalizedTag)) {
        return NextResponse.json({
          success: true,
          leadId,
          tags: currentTags,
          message: "Tag already exists",
        });
      }

      currentTags.push(normalizedTag);
      await db.lead.update({
        where: { id: leadId },
        data: { tags: currentTags.join(",") },
      });

      return NextResponse.json({
        success: true,
        leadId,
        tags: currentTags,
        addedTag: normalizedTag,
      });
    }

    if (action === "remove_tag") {
      const { tag } = body as { tag: string };
      if (!tag || typeof tag !== "string") {
        return NextResponse.json(
          { success: false, error: "Missing or invalid field: tag" },
          { status: 400 }
        );
      }

      const normalizedTag = tag.trim().toLowerCase().replace(/\s+/g, "-");
      const currentTags = lead.tags
        ? lead.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const filteredTags = currentTags.filter((t) => t !== normalizedTag);
      await db.lead.update({
        where: { id: leadId },
        data: { tags: filteredTags.join(",") },
      });

      return NextResponse.json({
        success: true,
        leadId,
        tags: filteredTags,
        removedTag: normalizedTag,
      });
    }

    if (action === "update_notes") {
      const { notes } = body as { notes: string };
      if (typeof notes !== "string") {
        return NextResponse.json(
          { success: false, error: "Missing or invalid field: notes" },
          { status: 400 }
        );
      }

      await db.lead.update({
        where: { id: leadId },
        data: { notes },
      });

      return NextResponse.json({
        success: true,
        leadId,
        notes,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unhandled action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Notes POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, notes } = body as { leadId: string; notes: string };

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

    await db.lead.update({
      where: { id: leadId },
      data: { notes: notes || "" },
    });

    return NextResponse.json({
      success: true,
      leadId,
      notes: notes || "",
    });
  } catch (error) {
    console.error("Notes PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
