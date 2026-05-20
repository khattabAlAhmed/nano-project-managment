import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * PATCH /api/projects/[projectId]/activities/[activityId]
 * Updates activity details and participating centers.
 * Only PROJECT_MANAGER can edit activities.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; activityId: string }> }
) {
  try {
    const { projectId, activityId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (dbUser.role !== Role.PROJECT_MANAGER) {
      return NextResponse.json(
        { error: "Forbidden: Only project managers can modify activities" },
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

    // Fetch activity
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        activityCenters: true,
      },
    });

    if (!activity || activity.projectId !== projectId) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const dataToUpdate: any = {};

    if (body.title !== undefined) {
      const title = body.title?.trim() || "";
      if (!title) {
        return NextResponse.json(
          { error: "Validation failed: Activity title cannot be empty" },
          { status: 400 }
        );
      }
      dataToUpdate.title = title;
    }

    if (body.description !== undefined) {
      dataToUpdate.description = body.description?.trim() || null;
    }

    if (body.plannedSessionCount !== undefined) {
      const psc = parseInt(body.plannedSessionCount, 10);
      if (isNaN(psc) || psc <= 0) {
        return NextResponse.json(
          { error: "Validation failed: Planned session count must be greater than 0" },
          { status: 400 }
        );
      }
      dataToUpdate.plannedSessionCount = psc;
    }

    if (body.isVolunteer !== undefined) {
      dataToUpdate.isVolunteer = !!body.isVolunteer;
    }

    // Validate and update dates
    let newStartDate = activity.startDate;
    let newEndDate = activity.endDate;

    if (body.startDate !== undefined) {
      newStartDate = body.startDate ? new Date(body.startDate) : null;
      dataToUpdate.startDate = newStartDate;
    }

    if (body.endDate !== undefined) {
      newEndDate = body.endDate ? new Date(body.endDate) : null;
      dataToUpdate.endDate = newEndDate;
    }

    // Date range validation within project
    if (newStartDate) {
      if (newStartDate < new Date(project.startDate) || newStartDate > new Date(project.endDate)) {
        return NextResponse.json(
          { error: `Validation failed: Start date must be within project date range (${new Date(project.startDate).toLocaleDateString()} to ${new Date(project.endDate).toLocaleDateString()})` },
          { status: 400 }
        );
      }
    }

    if (newEndDate) {
      if (newEndDate < new Date(project.startDate) || newEndDate > new Date(project.endDate)) {
        return NextResponse.json(
          { error: `Validation failed: End date must be within project date range (${new Date(project.startDate).toLocaleDateString()} to ${new Date(project.endDate).toLocaleDateString()})` },
          { status: 400 }
        );
      }
    }

    if (newStartDate && newEndDate && newStartDate > newEndDate) {
      return NextResponse.json(
        { error: "Validation failed: Start date must be before end date" },
        { status: 400 }
      );
    }

    const centerIds = body.centerIds;
    if (centerIds !== undefined) {
      if (!Array.isArray(centerIds) || centerIds.length === 0) {
        return NextResponse.json(
          { error: "Validation failed: At least one participating center is required" },
          { status: 400 }
        );
      }

      // Check active centers
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
    }

    // Execute in a transaction
    const updatedActivity = await prisma.$transaction(async (tx) => {
      // Update activity fields
      await tx.activity.update({
        where: { id: activityId },
        data: dataToUpdate,
      });

      // Update center assignments if provided
      if (centerIds !== undefined) {
        // Delete all old assignments
        await tx.activityCenter.deleteMany({
          where: { activityId },
        });

        // Add new ones
        await Promise.all(
          centerIds.map((cid: string) =>
            tx.activityCenter.create({
              data: {
                activityId,
                centerId: cid,
              },
            })
          )
        );
      }

      return tx.activity.findUnique({
        where: { id: activityId },
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

    return NextResponse.json(updatedActivity);
  } catch (error: any) {
    console.error("PATCH /api/projects/[projectId]/activities/[activityId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/activities/[activityId]
 * Soft-archives an activity.
 * Only PROJECT_MANAGER can archive activities.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; activityId: string }> }
) {
  try {
    const { projectId, activityId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (dbUser.role !== Role.PROJECT_MANAGER) {
      return NextResponse.json(
        { error: "Forbidden: Only project managers can archive activities" },
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

    // Fetch activity
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity || activity.projectId !== projectId) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Soft-archive the activity
    const archivedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: {
        archivedAt: new Date(),
      },
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

    return NextResponse.json(archivedActivity);
  } catch (error: any) {
    console.error("DELETE /api/projects/[projectId]/activities/[activityId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
