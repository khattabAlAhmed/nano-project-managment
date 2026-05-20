import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * GET /api/projects/[projectId]/activities
 * Returns all activities for a project.
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
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch activities
    const activities = await prisma.activity.findMany({
      where: { projectId },
      include: {
        activityCenters: {
          include: {
            center: {
              include: {
                manager: {
                  select: {
                    id: true,
                    clerkUserId: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(activities);
  } catch (error: any) {
    console.error("GET /api/projects/[projectId]/activities error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/activities
 * Creates a new activity.
 * Only PROJECT_MANAGER can create activities.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (dbUser.role !== Role.PROJECT_MANAGER) {
      return NextResponse.json(
        { error: "Forbidden: Only project managers can create activities" },
        { status: 403 }
      );
    }

    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Validate project is not archived
    if (project.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Validation failed: Archived projects are read-only" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const title = body.title?.trim() || "";
    const description = body.description?.trim() || null;
    const plannedSessionCount = parseInt(body.plannedSessionCount, 10);
    const isVolunteer = !!body.isVolunteer;
    const centerIds = body.centerIds || [];

    if (!title) {
      return NextResponse.json(
        { error: "Validation failed: Activity title is required" },
        { status: 400 }
      );
    }

    if (isNaN(plannedSessionCount) || plannedSessionCount <= 0) {
      return NextResponse.json(
        { error: "Validation failed: Planned session count must be greater than 0" },
        { status: 400 }
      );
    }

    if (!Array.isArray(centerIds) || centerIds.length === 0) {
      return NextResponse.json(
        { error: "Validation failed: At least one participating center is required" },
        { status: 400 }
      );
    }

    // Parse dates
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (body.startDate) {
      startDate = new Date(body.startDate);
      // Validate within project start date
      if (startDate < new Date(project.startDate)) {
        return NextResponse.json(
          { error: `Validation failed: Start date cannot be before project start date (${new Date(project.startDate).toLocaleDateString()})` },
          { status: 400 }
        );
      }
      if (startDate > new Date(project.endDate)) {
        return NextResponse.json(
          { error: `Validation failed: Start date cannot be after project end date (${new Date(project.endDate).toLocaleDateString()})` },
          { status: 400 }
        );
      }
    }

    if (body.endDate) {
      endDate = new Date(body.endDate);
      // Validate within project end date
      if (endDate > new Date(project.endDate)) {
        return NextResponse.json(
          { error: `Validation failed: End date cannot be after project end date (${new Date(project.endDate).toLocaleDateString()})` },
          { status: 400 }
        );
      }
      if (endDate < new Date(project.startDate)) {
        return NextResponse.json(
          { error: `Validation failed: End date cannot be before project start date (${new Date(project.startDate).toLocaleDateString()})` },
          { status: 400 }
        );
      }
    }

    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        { error: "Validation failed: Start date must be before end date" },
        { status: 400 }
      );
    }

    // Check that all selected centers exist and are not archived
    const activeCenters = await prisma.center.findMany({
      where: {
        id: { in: centerIds },
        archivedAt: null,
      },
    });

    if (activeCenters.length !== centerIds.length) {
      return NextResponse.json(
        { error: "Validation failed: One or more selected centers do not exist or are archived" },
        { status: 400 }
      );
    }

    // Create activity and assignments in a transaction
    const newActivity = await prisma.$transaction(async (tx) => {
      const act = await tx.activity.create({
        data: {
          projectId,
          title,
          description,
          plannedSessionCount,
          isVolunteer,
          startDate,
          endDate,
        },
      });

      // Create assignments
      await Promise.all(
        centerIds.map((cid) =>
          tx.activityCenter.create({
            data: {
              activityId: act.id,
              centerId: cid,
            },
          })
        )
      );

      return tx.activity.findUnique({
        where: { id: act.id },
        include: {
          activityCenters: {
            include: {
              center: {
                include: {
                  manager: {
                    select: {
                      id: true,
                      clerkUserId: true,
                      email: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(newActivity, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects/[projectId]/activities error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
