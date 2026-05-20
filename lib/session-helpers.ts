/**
 * Reusable helper logic for sessions.
 */

/**
 * Automatically detects whether a session is overdue/delayed.
 * A session is delayed if:
 * 1. Its status is explicitly marked as "DELAYED", OR
 * 2. It is not completed or cancelled, and the scheduled date has passed.
 */
export function isSessionDelayed(
  status: string,
  scheduledDate: Date | string
): boolean {
  if (status === "DELAYED") return true;
  if (status === "COMPLETED" || status === "CANCELLED") return false;

  const now = new Date();
  const targetDate = new Date(scheduledDate);
  return targetDate < now;
}
