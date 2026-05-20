import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTimelineData } from "@/services/timeline/timeline-data.service";

/**
 * GET /api/projects/[projectId]/timeline
 * Returns Gantt-ready timeline data for a project.
 * Supports ?groupBy=activity|center (default: activity)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Parse groupBy and type query params
    const url = new URL(request.url);
    const groupByParam = url.searchParams.get("groupBy");
    const groupBy: "activity" | "center" =
      groupByParam === "center" ? "center" : "activity";

    const typeParam = url.searchParams.get("type");
    const type: "all" | "core" | "volunteer" =
      typeParam === "volunteer" ? "volunteer" : typeParam === "core" ? "core" : "all";

    const data = await getTimelineData(projectId, groupBy, type);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/projects/[projectId]/timeline error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
