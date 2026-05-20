import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";
import { ApprovalStatus } from "@/app/generated/prisma/enums";
import {
  triggerApprovalSuccessNotification,
  triggerRejectionNotification,
} from "@/lib/notification-hooks";

/**
 * PATCH /api/sessions/[sessionId]/approval
 * Handles Project Manager decisions (approving or rejecting) on sessions submitted for operational review.
 * Transactionally saves historical ApprovalRecords and updates metrics triggers.
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

    // Role Guard: Only PROJECT_MANAGER can review and approve sessions
    if (dbUser.role !== Role.PROJECT_MANAGER) {
      console.warn(`[ApprovalsAPI] Unauthorized review attempt: User ${dbUser.email} is not a PROJECT_MANAGER`);
      return NextResponse.json(
        { error: "Forbidden: Only project managers can approve or reject operational sessions" },
        { status: 403 }
      );
    }

    // Fetch session details, project status, and constraints
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        project: true,
        activity: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        center: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 1. Validation: Read-only check for Archived projects
    if (session.project.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Validation failed: Archived projects are read-only" },
        { status: 400 }
      );
    }

    // 2. Validation: Only submitted sessions can be reviewed (must be in PENDING_APPROVAL)
    if (session.approvalStatus !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Validation failed: Only submitted sessions can be reviewed" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { action, reviewNotes } = body;

    // Validate review action parameter
    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Validation failed: Review action must be either 'APPROVE' or 'REJECT'" },
        { status: 400 }
      );
    }

    // 3. Validation: Rejected sessions require review notes
    const formattedNotes = reviewNotes?.trim();
    if (action === "REJECT" && (!formattedNotes || formattedNotes === "")) {
      return NextResponse.json(
        { error: "Validation failed: Rejection notes are required when rejecting a session submission" },
        { status: 400 }
      );
    }

    const finalStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    // 4. Transaction: Perform atomic update of Session and save history in ApprovalRecord
    const [updatedSession, _approvalRecord] = await prisma.$transaction([
      // Update target session
      prisma.session.update({
        where: { id: sessionId },
        data: {
          approvalStatus: finalStatus as ApprovalStatus,
          approvedAt: action === "APPROVE" ? new Date() : null,
        },
        include: {
          activity: {
            select: {
              id: true,
              title: true,
              description: true,
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
      }),

      // Create historical audit record (preserves complete review history)
      prisma.approvalRecord.create({
        data: {
          sessionId,
          reviewerId: dbUser.id,
          status: finalStatus as ApprovalStatus,
          reviewNotes: formattedNotes || null,
          reviewedAt: new Date(),
        },
      }),
    ]);

    // 5. Trigger notification hook asynchronously based on the review outcome
    if (action === "APPROVE") {
      triggerApprovalSuccessNotification(
        session.projectId,
        session.id,
        session.activity.title,
        session.center.name
      );
    } else {
      triggerRejectionNotification(
        session.projectId,
        session.id,
        session.activity.title,
        session.center.name,
        formattedNotes
      );
    }

    console.log(`[ApprovalsAPI] Successfully reviewed session ${sessionId} as ${finalStatus}`);
    return NextResponse.json(updatedSession);
  } catch (error: any) {
    console.error("PATCH /api/sessions/[sessionId]/approval error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
