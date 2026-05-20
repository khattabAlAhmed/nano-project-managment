import { prisma } from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────

export interface TimelineTask {
  id: string;
  name: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  progress: number; // 0-100
  status: string;
  customClass: string;
  // metadata for detail preview
  meta: {
    type: "activity" | "session";
    activityId: string;
    activityTitle: string;
    centerId?: string;
    centerName?: string;
    centerCity?: string;
    sessionStatus?: string;
    approvalStatus?: string;
    isLocked?: boolean;
    isManuallyAdjusted?: boolean;
    isDelayed?: boolean;
    notes?: string | null;
    documentationUrl?: string | null;
    scheduledDate?: string;
    isVolunteer?: boolean;
  };
}

export interface TimelineData {
  tasks: TimelineTask[];
  projectStart: string;
  projectEnd: string;
  summary: {
    totalActivities: number;
    totalSessions: number;
    completedSessions: number;
    delayedSessions: number;
    pendingSessions: number;
  };
}

// ─── Service ─────────────────────────────────────────────

export async function getTimelineData(
  projectId: string,
  groupBy: "activity" | "center" = "activity",
  type: "all" | "core" | "volunteer" = "all"
): Promise<TimelineData> {
  const now = new Date();

  // Fetch project, activities, and sessions in parallel
  const [project, rawActivities, rawSessions] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { startDate: true, endDate: true },
    }),
    prisma.activity.findMany({
      where: { projectId, archivedAt: null },
      include: {
        activityCenters: {
          include: {
            center: { select: { id: true, name: true, city: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.session.findMany({
      where: { projectId },
      include: {
        activity: { select: { id: true, title: true, isVolunteer: true } },
        center: { select: { id: true, name: true, city: true } },
      },
      orderBy: { scheduledDate: "asc" },
    }),
  ]);

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Filter based on type
  const activities = rawActivities.filter((a) => {
    if (type === "core") return a.isVolunteer === false;
    if (type === "volunteer") return a.isVolunteer === true;
    return true;
  });

  const sessions = rawSessions.filter((s) => {
    if (type === "core") return s.activity?.isVolunteer === false;
    if (type === "volunteer") return s.activity?.isVolunteer === true;
    return true;
  });

  const projectStart = formatDate(project.startDate);
  const projectEnd = formatDate(project.endDate);

  // Summary counters
  let completedSessions = 0;
  let delayedSessions = 0;
  let pendingSessions = 0;

  sessions.forEach((s) => {
    const isCompleted = s.status === "COMPLETED";
    const isCancelled = s.status === "CANCELLED";
    const isDelayed =
      s.status === "DELAYED" ||
      (!isCompleted && !isCancelled && new Date(s.scheduledDate) < now);

    if (isCompleted) completedSessions++;
    else if (isDelayed) delayedSessions++;
    else if (!isCancelled) pendingSessions++;
  });

  let tasks: TimelineTask[];

  if (groupBy === "center") {
    tasks = buildCenterGroupedTasks(activities, sessions, now);
  } else {
    tasks = buildActivityGroupedTasks(activities, sessions, now);
  }

  return {
    tasks,
    projectStart,
    projectEnd,
    summary: {
      totalActivities: activities.length,
      totalSessions: sessions.length,
      completedSessions,
      delayedSessions,
      pendingSessions,
    },
  };
}

// ─── Activity View ───────────────────────────────────────

function buildActivityGroupedTasks(
  activities: any[],
  sessions: any[],
  now: Date
): TimelineTask[] {
  const tasks: TimelineTask[] = [];

  // Build a map of sessions per activity
  const sessionsByActivity = new Map<string, any[]>();
  sessions.forEach((s) => {
    const existing = sessionsByActivity.get(s.activityId) || [];
    existing.push(s);
    sessionsByActivity.set(s.activityId, existing);
  });

  for (const activity of activities) {
    const actSessions = sessionsByActivity.get(activity.id) || [];

    if (actSessions.length === 0) continue;

    // Compute activity date range from its sessions
    const dates = actSessions.map((s: any) => new Date(s.scheduledDate).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Add 1 day to end so the bar has visible width
    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 1);

    // Progress: proportion of completed sessions
    const completed = actSessions.filter((s: any) => s.status === "COMPLETED").length;
    const progress = actSessions.length > 0 ? Math.round((completed / actSessions.length) * 100) : 0;

    // Determine dominant status for coloring
    const hasDelayed = actSessions.some(
      (s: any) =>
        s.status === "DELAYED" ||
        (s.status !== "COMPLETED" && s.status !== "CANCELLED" && new Date(s.scheduledDate) < now)
    );

    const allCompleted = actSessions.every((s: any) => s.status === "COMPLETED");
    const dominantStatus = allCompleted ? "COMPLETED" : hasDelayed ? "DELAYED" : "PENDING";

    tasks.push({
      id: `activity-${activity.id}`,
      name: `${activity.title} (${completed}/${actSessions.length})`,
      start: formatDate(minDate),
      end: formatDate(endDate),
      progress,
      status: dominantStatus,
      customClass: `gantt-status-${dominantStatus.toLowerCase()}${activity.isVolunteer ? " gantt-volunteer" : ""}`,
      meta: {
        type: "activity",
        activityId: activity.id,
        activityTitle: activity.title,
        isDelayed: hasDelayed,
        isVolunteer: activity.isVolunteer,
      },
    });
  }

  return tasks;
}

// ─── Session View (grouped by activity) ──────────────────

export function buildSessionTasks(
  sessions: any[],
  now: Date
): TimelineTask[] {
  return sessions
    .filter((s: any) => s.status !== "CANCELLED")
    .map((s: any) => {
      const scheduledDate = new Date(s.scheduledDate);
      const endDate = new Date(scheduledDate);
      endDate.setDate(endDate.getDate() + 1);

      const isCompleted = s.status === "COMPLETED";
      const isDelayed =
        s.status === "DELAYED" ||
        (!isCompleted && scheduledDate < now);

      const effectiveStatus = isDelayed ? "DELAYED" : s.status;
      const progress = isCompleted ? 100 : 0;

      return {
        id: `session-${s.id}`,
        name: `${s.activity?.title || "Session"} — ${s.center?.name || "Unassigned"}`,
        start: formatDate(scheduledDate),
        end: formatDate(endDate),
        progress,
        status: effectiveStatus,
        customClass: `gantt-status-${effectiveStatus.toLowerCase()}${s.activity?.isVolunteer ? " gantt-volunteer" : ""}`,
        meta: {
          type: "session" as const,
          activityId: s.activityId,
          activityTitle: s.activity?.title || "Unknown",
          centerId: s.centerId,
          centerName: s.center?.name || "Unassigned",
          centerCity: s.center?.city || "",
          sessionStatus: s.status,
          approvalStatus: s.approvalStatus,
          isLocked: s.isLocked,
          isManuallyAdjusted: s.isManuallyAdjusted,
          isDelayed,
          notes: s.notes,
          documentationUrl: s.documentationUrl,
          scheduledDate: formatDate(scheduledDate),
          isVolunteer: s.activity?.isVolunteer,
        },
      };
    });
}

// ─── Center-grouped View ─────────────────────────────────

function buildCenterGroupedTasks(
  activities: any[],
  sessions: any[],
  now: Date
): TimelineTask[] {
  const tasks: TimelineTask[] = [];

  // Group sessions by center
  const sessionsByCenter = new Map<string, any[]>();
  sessions.forEach((s) => {
    const key = s.centerId || "unassigned";
    const existing = sessionsByCenter.get(key) || [];
    existing.push(s);
    sessionsByCenter.set(key, existing);
  });

  for (const [centerId, centerSessions] of sessionsByCenter.entries()) {
    if (centerSessions.length === 0) continue;

    const centerInfo = centerSessions[0]?.center;
    const centerName = centerInfo?.name || "Unassigned";

    // Compute date range
    const dates = centerSessions.map((s: any) => new Date(s.scheduledDate).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 1);

    // Progress
    const completed = centerSessions.filter((s: any) => s.status === "COMPLETED").length;
    const progress = Math.round((completed / centerSessions.length) * 100);

    // Status
    const hasDelayed = centerSessions.some(
      (s: any) =>
        s.status === "DELAYED" ||
        (s.status !== "COMPLETED" && s.status !== "CANCELLED" && new Date(s.scheduledDate) < now)
    );
    const allCompleted = centerSessions.every((s: any) => s.status === "COMPLETED");
    const dominantStatus = allCompleted ? "COMPLETED" : hasDelayed ? "DELAYED" : "PENDING";

    tasks.push({
      id: `center-${centerId}`,
      name: `${centerName} (${completed}/${centerSessions.length})`,
      start: formatDate(minDate),
      end: formatDate(endDate),
      progress,
      status: dominantStatus,
      customClass: `gantt-status-${dominantStatus.toLowerCase()}`,
      meta: {
        type: "activity",
        activityId: "",
        activityTitle: centerName,
        centerId,
        centerName,
        centerCity: centerInfo?.city || "",
        isDelayed: hasDelayed,
      },
    });
  }

  return tasks;
}

// ─── Helpers ─────────────────────────────────────────────

function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
