import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * GET /api/projects/[projectId]/approvals
 * Returns the active approval queue and recent review history for a specific project planning container.
 * Accessible only to Project Managers.
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

    // Role Guard: Only PROJECT_MANAGER can query project approvals
    if (dbUser.role !== Role.PROJECT_MANAGER) {
      console.warn(`[ApprovalsAPI] Unauthorized GET queue request: User ${dbUser.email} is not a PROJECT_MANAGER`);
      return NextResponse.json(
        { error: "Forbidden: Only project managers can access approvals workflow data" },
        { status: 403 }
      );
    }

    // Verify target project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 1. Fetch approval queue: PENDING_APPROVAL sessions
    const queue = await prisma.session.findMany({
      where: {
        projectId,
        approvalStatus: "PENDING_APPROVAL",
      },
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            description: true,
            isVolunteer: true,
          },
        },
        center: {
          select: {
            id: true,
            name: true,
            city: true,
            manager: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: "asc", // FIFO order: longest waiting first
      },
    });

    // 2. Fetch history: Recent ApprovalRecords for sessions in this project
    const history = await prisma.approvalRecord.findMany({
      where: {
        session: {
          projectId,
        },
      },
      include: {
        session: {
          select: {
            id: true,
            scheduledDate: true,
            status: true,
            documentationUrl: true,
            activity: {
              select: {
                title: true,
                isVolunteer: true,
              },
            },
            center: {
              select: {
                name: true,
                city: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        reviewedAt: "desc", // Newest reviews first
      },
      take: 50, // Cap at latest 50 review history records
    });

    return NextResponse.json({ queue, history });
  } catch (error: any) {
    console.error("GET /api/projects/[projectId]/approvals error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
