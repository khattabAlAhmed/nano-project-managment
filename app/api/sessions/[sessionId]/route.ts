import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * PATCH /api/sessions/[sessionId]
 * Updates session parameters (date, center reassignment, lock state, adjust reason).
 * Only PROJECT_MANAGER role is allowed to edit.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (dbUser.role !== Role.PROJECT_MANAGER) {
      console.warn(`[SessionsAPI] Permission denied: User ${dbUser.email} is not a PROJECT_MANAGER`);
      return NextResponse.json(
        { error: "Forbidden: Only project managers can modify schedules" },
        { status: 403 }
      );
    }

    // Fetch session details, project, and activity constraints
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        project: true,
        activity: {
          include: {
            activityCenters: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify project is active
    if (session.project.status === "ARCHIVED") {
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

    const dataToUpdate: any = {};
    let hasScheduleAdjustment = false;

    // 1. Process lock state
    if (body.isLocked !== undefined) {
      dataToUpdate.isLocked = !!body.isLocked;
    }

    // 2. Process manual adjustment reason
    if (body.manualAdjustmentReason !== undefined) {
      dataToUpdate.manualAdjustmentReason = body.manualAdjustmentReason?.trim() || null;
    }

    // 3. Process scheduled date
    if (body.scheduledDate !== undefined) {
      if (!body.scheduledDate) {
        return NextResponse.json(
          { error: "Validation failed: Scheduled date is required" },
          { status: 400 }
        );
      }

      const newDate = new Date(body.scheduledDate);
      if (isNaN(newDate.getTime())) {
        return NextResponse.json(
          { error: "Validation failed: Invalid date format" },
          { status: 400 }
        );
      }

      // Check project boundaries
      const projStart = new Date(session.project.startDate);
      const projEnd = new Date(session.project.endDate);
      if (newDate < projStart || newDate > projEnd) {
        return NextResponse.json(
          {
            error: `Validation failed: Scheduled date must fall within project duration range (${projStart.toLocaleDateString()} to ${projEnd.toLocaleDateString()})`,
          },
          { status: 400 }
        );
      }

      // Check activity boundaries
      if (session.activity.startDate) {
        const actStart = new Date(session.activity.startDate);
        if (newDate < actStart) {
          return NextResponse.json(
            {
              error: `Validation failed: Scheduled date cannot be before activity start date (${actStart.toLocaleDateString()})`,
            },
            { status: 400 }
          );
        }
      }

      if (session.activity.endDate) {
        const actEnd = new Date(session.activity.endDate);
        if (newDate > actEnd) {
          return NextResponse.json(
            {
              error: `Validation failed: Scheduled date cannot be after activity end date (${actEnd.toLocaleDateString()})`,
            },
            { status: 400 }
          );
        }
      }

      dataToUpdate.scheduledDate = newDate;
      if (newDate.getTime() !== new Date(session.scheduledDate).getTime()) {
        hasScheduleAdjustment = true;
      }
    }

    // 4. Process center reassignment
    if (body.centerId !== undefined) {
      if (!body.centerId) {
        return NextResponse.json(
          { error: "Validation failed: Center is required" },
          { status: 400 }
        );
      }

      // Verify that center belongs to the activity's assigned centers
      const isParticipating = session.activity.activityCenters.some(
        (ac) => ac.centerId === body.centerId
      );

      if (!isParticipating) {
        return NextResponse.json(
          {
            error: "Validation failed: The selected center is not assigned to this activity",
          },
          { status: 400 }
        );
      }

      // Verify center is active
      const activeCenter = await prisma.center.findFirst({
        where: { id: body.centerId, archivedAt: null },
      });

      if (!activeCenter) {
        return NextResponse.json(
          {
            error: "Validation failed: The selected center is archived or does not exist",
          },
          { status: 400 }
        );
      }

      dataToUpdate.centerId = body.centerId;
      if (body.centerId !== session.centerId) {
        hasScheduleAdjustment = true;
      }
    }

    // 5. Track manual scheduling adjustments
    if (hasScheduleAdjustment) {
      dataToUpdate.isManuallyAdjusted = true;
    }

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: dataToUpdate,
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
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
    });

    console.log(`[SessionsAPI] Successfully updated session ${sessionId}`);
    return NextResponse.json(updatedSession);
  } catch (error: any) {
    console.error("PATCH /api/sessions/[sessionId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
