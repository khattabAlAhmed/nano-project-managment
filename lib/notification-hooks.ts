import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/app/generated/prisma/enums";

/**
 * Triggers an automatic notification record on session approval success.
 */
export async function triggerApprovalSuccessNotification(
  projectId: string,
  sessionId: string,
  activityTitle: string,
  centerName: string
) {
  console.log(`[Notification Hook] Session Approved - Project: ${projectId}, Session: ${sessionId}`);
  try {
    await prisma.notification.create({
      data: {
        projectId,
        title: "Session Approved",
        message: `The session for "${activityTitle}" at "${centerName}" has been officially approved.`,
        type: "INFO" as NotificationType,
      },
    });
  } catch (error) {
    console.error("Failed to create approval success notification:", error);
  }
}

/**
 * Triggers an automatic notification record on session rejection.
 */
export async function triggerRejectionNotification(
  projectId: string,
  sessionId: string,
  activityTitle: string,
  centerName: string,
  reviewNotes: string
) {
  console.log(`[Notification Hook] Session Rejected - Project: ${projectId}, Session: ${sessionId}`);
  try {
    await prisma.notification.create({
      data: {
        projectId,
        title: "Session Rejected",
        message: `The session for "${activityTitle}" at "${centerName}" was rejected. Reason: ${reviewNotes}`,
        type: "WARNING" as NotificationType,
      },
    });
  } catch (error) {
    console.error("Failed to create rejection notification:", error);
  }
}

/**
 * Triggers a reminder notification for pending session approvals.
 */
export async function triggerPendingReviewReminderNotification(
  projectId: string,
  sessionId: string,
  activityTitle: string,
  centerName: string
) {
  console.log(`[Notification Hook] Pending Approval Reminder - Project: ${projectId}, Session: ${sessionId}`);
  try {
    await prisma.notification.create({
      data: {
        projectId,
        title: "Pending Approval Reminder",
        message: `The session for "${activityTitle}" at "${centerName}" is awaiting project manager review.`,
        type: "INFO" as NotificationType,
      },
    });
  } catch (error) {
    console.error("Failed to create pending review reminder notification:", error);
  }
}
