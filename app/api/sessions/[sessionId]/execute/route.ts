import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";
import { SessionStatus, ApprovalStatus } from "@/app/generated/prisma/enums";

/**
 * PATCH /api/sessions/[sessionId]/execute
 * Handles session progress updates, notes, documentation URLs, and approval submission.
 * Enforces strict security boundaries between Center Managers and Project Managers.
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

    // Fetch the session with its project and center details
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        project: true,
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

    // 2. Authorization: Only the assigned center manager (or a Project Manager) can execute this session
    const isAssignedManager = session.center.managerId === dbUser.id;
    const isProjectManager = dbUser.role === Role.PROJECT_MANAGER;

    if (!isAssignedManager && !isProjectManager) {
      console.warn(
        `[SessionExecuteAPI] Unauthorized execution attempt: User ${dbUser.email} tried executing session ${sessionId}`
      );
      return NextResponse.json(
        { error: "Forbidden: Only the assigned center manager can execute this session" },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { status, notes, documentationUrl, approvalStatus } = body;
    const dataToUpdate: any = {};

    // 3. Process status update with reversion guard
    if (status !== undefined) {
      // Validate that status matches the enum values
      const validStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DELAYED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Validation failed: Invalid session status" },
          { status: 400 }
        );
      }

      // Reversion Guard: Completed sessions cannot be reverted without Project Manager authorization
      const isTryingToRevert = session.status === "COMPLETED" && status !== "COMPLETED";
      if (isTryingToRevert && !isProjectManager) {
        return NextResponse.json(
          { error: "Forbidden: Completed sessions cannot be reverted without Project Manager authorization" },
          { status: 403 }
        );
      }

      dataToUpdate.status = status as SessionStatus;
    }

    // 4. Process notes
    if (notes !== undefined) {
      dataToUpdate.notes = notes?.trim() || null;
    }

    // 5. Process documentation URL
    if (documentationUrl !== undefined) {
      const trimmedUrl = documentationUrl?.trim() || null;
      if (trimmedUrl) {
        // Basic URL validation
        try {
          new URL(trimmedUrl);
        } catch {
          return NextResponse.json(
            { error: "Validation failed: Invalid documentation URL format" },
            { status: 400 }
          );
        }
      }
      dataToUpdate.documentationUrl = trimmedUrl;
    }

    // 6. Process approval status (e.g. submitting for review)
    if (approvalStatus !== undefined) {
      // Center Managers can only submit for review
      if (approvalStatus === "PENDING_APPROVAL") {
        // Validate documentation URL is present
        const finalDocUrl =
          documentationUrl !== undefined ? documentationUrl?.trim() : session.documentationUrl;

        if (!finalDocUrl || finalDocUrl.trim() === "") {
          return NextResponse.json(
            { error: "Validation failed: Documentation URL is required before submitting for approval" },
            { status: 400 }
          );
        }

        dataToUpdate.approvalStatus = "PENDING_APPROVAL" as ApprovalStatus;
        dataToUpdate.submittedAt = new Date();

        // Automatically set status to COMPLETED if it wasn't already
        dataToUpdate.status = "COMPLETED" as SessionStatus;
      } else if (approvalStatus === "NOT_SUBMITTED") {
        // Can reset back to NOT_SUBMITTED (e.g., if reverting or correcting)
        dataToUpdate.approvalStatus = "NOT_SUBMITTED" as ApprovalStatus;
        dataToUpdate.submittedAt = null;
      } else {
        // Center Managers cannot approve or reject sessions
        if (!isProjectManager) {
          return NextResponse.json(
            { error: "Forbidden: Only Project Managers can approve or reject sessions" },
            { status: 403 }
          );
        }
        dataToUpdate.approvalStatus = approvalStatus as ApprovalStatus;
        if (approvalStatus === "APPROVED" || approvalStatus === "REJECTED") {
          dataToUpdate.approvedAt = new Date();
        }
      }
    }

    // Perform database transaction
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: dataToUpdate,
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
    });

    console.log(`[SessionExecuteAPI] Successfully executed/updated session ${sessionId}`);
    return NextResponse.json(updatedSession);
  } catch (error: any) {
    console.error("PATCH /api/sessions/[sessionId]/execute error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
