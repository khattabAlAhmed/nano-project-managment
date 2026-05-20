import { prisma } from "@/lib/prisma";

export interface DashboardOverview {
  status: string;
  startDate: Date;
  endDate: Date;
  participatingCentersCount: number;
  totalActivitiesCount: number;
  totalSessionsCount: number;
  ownerEmail: string;
  description: string | null;
}

export interface DashboardProgress {
  totalSessions: number;
  completedSessions: number;
  pendingSessions: number;
  delayedSessions: number;
  cancelledSessions: number;
  approvalQueueCount: number;
  completionPercentage: number;
}

export interface TimelineSession {
  id: string;
  activityTitle: string;
  centerName: string;
  city: string;
  scheduledDate: Date;
  status: string;
}

export interface DashboardTimelineHealth {
  todaySessionsCount: number;
  upcomingSessions: TimelineSession[];
  overdueSessions: TimelineSession[];
}

export interface CenterPerformanceMetric {
  centerId: string;
  centerName: string;
  city: string;
  assignedSessions: number;
  completedSessions: number;
  delayedSessions: number;
  completionPercentage: number;
}

export interface VolunteerActivitySummary {
  volunteerSessionsCount: number;
  volunteerCompletedCount: number;
  volunteerCompletionPercentage: number;
}

export interface RecentOperationalActivity {
  id: string;
  type: "APPROVAL" | "COMPLETION" | "ADJUSTMENT";
  title: string;
  description: string;
  timestamp: Date;
}

export interface DashboardAggregateData {
  projectOverview: DashboardOverview;
  progressOverview: DashboardProgress;
  timelineHealth: DashboardTimelineHealth;
  centerPerformance: CenterPerformanceMetric[];
  volunteerSummary: VolunteerActivitySummary;
  recentActivity: RecentOperationalActivity[];
}

/**
 * Service to aggregate project-specific dashboard metrics with high query performance.
 */
export async function getProjectDashboardData(projectId: string): Promise<DashboardAggregateData> {
  const now = new Date();

  // Fetch project details first
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { email: true } },
    },
  });

  if (!project) {
    throw new Error(`Project with ID ${projectId} not found.`);
  }

  // Run independent count and data queries in parallel
  const [
    totalActivitiesCount,
    participatingCenters,
    allSessions,
    recentApprovals,
    recentCompletions,
    recentAdjustments,
  ] = await Promise.all([
    // 1. Total activities count
    prisma.activity.count({ where: { projectId } }),

    // 2. Participating centers (via ProjectCenter relations)
    prisma.projectCenter.findMany({
      where: { projectId },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    }),

    // 3. All sessions of the project to compile metrics in a single traversal
    prisma.session.findMany({
      where: { projectId },
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            isVolunteer: true,
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
    }),

    // 4. Recent approval activities
    prisma.approvalRecord.findMany({
      where: { session: { projectId } },
      orderBy: { reviewedAt: "desc" },
      take: 5,
      include: {
        session: {
          select: {
            activity: { select: { title: true } },
            center: { select: { name: true } },
          },
        },
        reviewer: { select: { email: true } },
      },
    }),

    // 5. Recent completed sessions
    prisma.session.findMany({
      where: { projectId, status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        activity: { select: { title: true } },
        center: { select: { name: true } },
      },
    }),

    // 6. Recent manual schedule adjustments
    prisma.session.findMany({
      where: { projectId, isManuallyAdjusted: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        activity: { select: { title: true } },
        center: { select: { name: true } },
      },
    }),
  ]);

  // Initializing counters
  let completedSessions = 0;
  let pendingSessions = 0;
  let delayedSessions = 0;
  let cancelledSessions = 0;
  let approvalQueueCount = 0;

  // Volunteer scope counters
  let volunteerSessionsCount = 0;
  let volunteerCompletedCount = 0;

  // Core (non-volunteer) sessions counters for progress bar calculation
  let coreSessionsCount = 0;
  let coreCompletedCount = 0;

  // Center metrics map
  const centerMetricsMap = new Map<string, { assigned: number; completed: number; delayed: number }>();
  participatingCenters.forEach((pc) => {
    if (pc.center) {
      centerMetricsMap.set(pc.center.id, { assigned: 0, completed: 0, delayed: 0 });
    }
  });

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let todaySessionsCount = 0;

  // Single traversal over all sessions to aggregate statistics and center performances
  allSessions.forEach((s) => {
    const isCompleted = s.status === "COMPLETED";
    const isCancelled = s.status === "CANCELLED";
    const isSessionDelayed =
      s.status === "DELAYED" ||
      (!isCompleted && !isCancelled && new Date(s.scheduledDate) < now);

    // General counters
    if (isCompleted) completedSessions++;
    else if (isCancelled) cancelledSessions++;
    else pendingSessions++;

    if (isSessionDelayed) delayedSessions++;

    if (s.approvalStatus === "PENDING_APPROVAL") {
      approvalQueueCount++;
    }

    // Split between core and volunteer activities
    const isVol = s.activity?.isVolunteer || false;
    if (isVol) {
      volunteerSessionsCount++;
      if (isCompleted) volunteerCompletedCount++;
    } else {
      coreSessionsCount++;
      if (isCompleted) coreCompletedCount++;
    }

    // Today count check
    const schedTime = new Date(s.scheduledDate).getTime();
    if (schedTime >= todayStart.getTime() && schedTime <= todayEnd.getTime()) {
      todaySessionsCount++;
    }

    // Center performance calculations
    if (s.centerId) {
      const current = centerMetricsMap.get(s.centerId) || { assigned: 0, completed: 0, delayed: 0 };
      current.assigned++;
      if (isCompleted) current.completed++;
      if (isSessionDelayed) current.delayed++;
      centerMetricsMap.set(s.centerId, current);
    }
  });

  // Calculate percentages
  const completionPercentage = coreSessionsCount > 0
    ? Math.round((coreCompletedCount / coreSessionsCount) * 100)
    : 0;

  const volunteerCompletionPercentage = volunteerSessionsCount > 0
    ? Math.round((volunteerCompletedCount / volunteerSessionsCount) * 100)
    : 0;

  // Format Center Performance metrics
  const centerPerformance: CenterPerformanceMetric[] = participatingCenters
    .filter((pc) => pc.center !== null)
    .map((pc) => {
      const stats = centerMetricsMap.get(pc.center.id) || { assigned: 0, completed: 0, delayed: 0 };
      const percentage = stats.assigned > 0
        ? Math.round((stats.completed / stats.assigned) * 100)
        : 0;

      return {
        centerId: pc.center.id,
        centerName: pc.center.name,
        city: pc.center.city,
        assignedSessions: stats.assigned,
        completedSessions: stats.completed,
        delayedSessions: stats.delayed,
        completionPercentage: percentage,
      };
    });

  // Extract upcoming sessions (not completed, sorted by date asc)
  const upcomingSessions: TimelineSession[] = allSessions
    .filter((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED" && new Date(s.scheduledDate) >= now)
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      activityTitle: s.activity?.title || "Unknown Activity",
      centerName: s.center?.name || "Unassigned",
      city: s.center?.city || "",
      scheduledDate: s.scheduledDate,
      status: s.status,
    }));

  // Extract overdue sessions (not completed, scheduledDate in past, sorted by date asc)
  const overdueSessions: TimelineSession[] = allSessions
    .filter((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED" && new Date(s.scheduledDate) < now)
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      activityTitle: s.activity?.title || "Unknown Activity",
      centerName: s.center?.name || "Unassigned",
      city: s.center?.city || "",
      scheduledDate: s.scheduledDate,
      status: s.status,
    }));

  // Format and aggregate recent operational activity feed (Unified feed)
  const recentActivity: RecentOperationalActivity[] = [];

  recentApprovals.forEach((app) => {
    recentActivity.push({
      id: app.id,
      type: "APPROVAL",
      title: "Session Approved",
      description: `"${app.session?.activity?.title || "Session"}" at branch "${app.session?.center?.name || "Center"}" reviewed by ${app.reviewer?.email || "Manager"} (${app.status.toLowerCase()}).`,
      timestamp: app.reviewedAt,
    });
  });

  recentCompletions.forEach((c) => {
    recentActivity.push({
      id: c.id,
      type: "COMPLETION",
      title: "Session Completed",
      description: `"${c.activity?.title || "Session"}" session at branch "${c.center?.name || "Center"}" successfully finished.`,
      timestamp: c.updatedAt,
    });
  });

  recentAdjustments.forEach((adj) => {
    recentActivity.push({
      id: adj.id,
      type: "ADJUSTMENT",
      title: "Schedule Adjusted",
      description: `"${adj.activity?.title || "Session"}" session at branch "${adj.center?.name || "Center"}" manually rescheduled${adj.manualAdjustmentReason ? ` (${adj.manualAdjustmentReason})` : ""}.`,
      timestamp: adj.updatedAt,
    });
  });

  // Sort activity timeline chronologically (newest first)
  recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const finalRecentActivity = recentActivity.slice(0, 8);

  return {
    projectOverview: {
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      participatingCentersCount: participatingCenters.length,
      totalActivitiesCount,
      totalSessionsCount: allSessions.length,
      ownerEmail: project.owner?.email || "Unknown",
      description: project.description,
    },
    progressOverview: {
      totalSessions: allSessions.length,
      completedSessions,
      pendingSessions,
      delayedSessions,
      cancelledSessions,
      approvalQueueCount,
      completionPercentage,
    },
    timelineHealth: {
      todaySessionsCount,
      upcomingSessions,
      overdueSessions,
    },
    centerPerformance,
    volunteerSummary: {
      volunteerSessionsCount,
      volunteerCompletedCount,
      volunteerCompletionPercentage,
    },
    recentActivity: finalRecentActivity,
  };
}
