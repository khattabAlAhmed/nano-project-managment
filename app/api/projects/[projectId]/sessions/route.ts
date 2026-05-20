import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/projects/[projectId]/sessions
 * Returns all sessions for a project with their associated activity and center info.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      console.warn(`[SessionsAPI] Unauthenticated request for project ${projectId}`);
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      console.warn(`[SessionsAPI] Validation failed: Project ${projectId} not found`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch sessions
    const sessions = await prisma.session.findMany({
      where: { projectId },
      include: {
        activity: {
          include: {
            activityCenters: {
              include: {
                center: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
        center: {
          select: {
            id: true,
            name: true,
            city: true,
            managerId: true,
          },
        },
      },
      orderBy: {
        scheduledDate: "asc",
      },
    });

    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error("GET /api/projects/[projectId]/sessions error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
