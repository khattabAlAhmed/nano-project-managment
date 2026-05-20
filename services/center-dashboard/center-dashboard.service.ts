import { prisma } from "@/lib/prisma";
import { SessionStatus, ApprovalStatus } from "@/app/generated/prisma/enums";

export interface CenterOverviewMetric {
  centers: {
    id: string;
    name: string;
    city: string;
  }[];
  assignedProjects: {
    id: string;
    name: string;
    status: string;
  }[];
  totalSessions: number;
  completedSessions: number;
  delayedSessions: number;
  pendingApprovals: number;
  completionPercentage: number;
}

export interface CenterSessionData {
  id: string;
  activityTitle: string;
  projectId: string;
  projectName: string;
  centerId: string;
  centerName: string;
  city: string;
  scheduledDate: string;
  status: SessionStatus;
  approvalStatus: ApprovalStatus;
  documentationUrl: string | null;
  notes: string | null;
  isLocked: boolean;
  isManuallyAdjusted: boolean;
  isDelayed: boolean;
}

export interface CenterActionItem {
  id: string;
  activityTitle: string;
  centerName: string;
  scheduledDate: string;
  status: SessionStatus;
  approvalStatus: ApprovalStatus;
  type: "EXECUTION" | "DOCUMENTATION" | "REVISION";
  reason?: string | null;
}

export interface CenterProgressSummary {
  centerCompletionRate: number;
  totalSessions: number;
  completedSessions: number;
  pendingApprovals: number;
  volunteerSessionsCount: number;
  volunteerCompletedCount: number;
  volunteerCompletionPercentage: number;
}

export interface CenterDashboardData {
  overview: CenterOverviewMetric;
  sessions: CenterSessionData[];
  upcomingSessions: CenterSessionData[];
  overdueSessions: CenterSessionData[];
  actionQueue: CenterActionItem[];
  progressSummary: CenterProgressSummary;
}

export async function getCenterDashboardData(userId: string): Promise<CenterDashboardData> {
  const now = new Date();

  // 1. Fetch centers managed by the user
  const managedCenters = await prisma.center.findMany({
    where: {
      managerId: userId,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      city: true,
    },
  });

  if (managedCenters.length === 0) {
    return {
      overview: {
        centers: [],
        assignedProjects: [],
        totalSessions: 0,
        completedSessions: 0,
        delayedSessions: 0,
        pendingApprovals: 0,
        completionPercentage: 0,
      },
      sessions: [],
      upcomingSessions: [],
      overdueSessions: [],
      actionQueue: [],
      progressSummary: {
        centerCompletionRate: 0,
        totalSessions: 0,
        completedSessions: 0,
        pendingApprovals: 0,
        volunteerSessionsCount: 0,
        volunteerCompletedCount: 0,
        volunteerCompletionPercentage: 0,
      },
    };
  }

  const centerIds = managedCenters.map((c) => c.id);

  // 2. Fetch all sessions in managed centers with full relation data
  const sessions = await prisma.session.findMany({
    where: {
      centerId: { in: centerIds },
    },
    include: {
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
      project: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: {
      scheduledDate: "asc",
    },
  });

  // 3. Process sessions & compile metrics
  const mappedSessions: CenterSessionData[] = sessions.map((s) => {
    const isCompleted = s.status === "COMPLETED";
    const isCancelled = s.status === "CANCELLED";
    const isDelayed =
      s.status === "DELAYED" ||
      (!isCompleted && !isCancelled && new Date(s.scheduledDate) < now);

    return {
      id: s.id,
      activityTitle: s.activity?.title || "Unknown Session",
      projectId: s.projectId,
      projectName: s.project?.name || "Unknown Project",
      centerId: s.centerId,
      centerName: s.center?.name || "Unknown Center",
      city: s.center?.city || "",
      scheduledDate: s.scheduledDate.toISOString(),
      status: s.status,
      approvalStatus: s.approvalStatus,
      documentationUrl: s.documentationUrl,
      notes: s.notes,
      isLocked: s.isLocked,
      isManuallyAdjusted: s.isManuallyAdjusted,
      isDelayed,
    };
  });

  // Calculate Overview & Summary details
  const activeSessions = mappedSessions.filter((s) => s.status !== "CANCELLED");
  const totalCount = activeSessions.length;
  const completedCount = activeSessions.filter(
    (s) => s.status === "COMPLETED" && s.approvalStatus === "APPROVED"
  ).length;
  const delayedCount = activeSessions.filter((s) => s.isDelayed).length;
  const pendingApprovalsCount = activeSessions.filter(
    (s) => s.approvalStatus === "PENDING_APPROVAL"
  ).length;

  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Extract unique assigned projects
  const uniqueProjectsMap = new Map<string, { id: string; name: string; status: string }>();
  sessions.forEach((s) => {
    if (s.project && !uniqueProjectsMap.has(s.projectId)) {
      uniqueProjectsMap.set(s.projectId, {
        id: s.projectId,
        name: s.project.name,
        status: s.project.status,
      });
    }
  });
  const assignedProjects = Array.from(uniqueProjectsMap.values());

  // Upcoming sessions (next 5, scheduledDate >= now)
  const upcomingSessions = mappedSessions
    .filter((s) => s.status !== "CANCELLED" && s.status !== "COMPLETED" && new Date(s.scheduledDate) >= now)
    .slice(0, 5);

  // Overdue sessions (scheduledDate < now and not completed)
  const overdueSessions = mappedSessions
    .filter((s) => s.status !== "CANCELLED" && s.status !== "COMPLETED" && s.isDelayed)
    .slice(0, 5);

  // 4. Action Queue Compilation
  const actionQueue: CenterActionItem[] = [];

  // - Sessions requiring execution: PENDING or IN_PROGRESS
  const executionSessions = mappedSessions.filter(
    (s) => s.status === "PENDING" || s.status === "IN_PROGRESS"
  );
  executionSessions.forEach((s) => {
    actionQueue.push({
      id: s.id,
      activityTitle: s.activityTitle,
      centerName: s.centerName,
      scheduledDate: s.scheduledDate,
      status: s.status,
      approvalStatus: s.approvalStatus,
      type: "EXECUTION",
    });
  });

  // - Sessions completed but awaiting documentation (documentationUrl is empty/null)
  const docSessions = mappedSessions.filter(
    (s) => s.status === "COMPLETED" && (!s.documentationUrl || s.documentationUrl.trim() === "")
  );
  docSessions.forEach((s) => {
    actionQueue.push({
      id: s.id,
      activityTitle: s.activityTitle,
      centerName: s.centerName,
      scheduledDate: s.scheduledDate,
      status: s.status,
      approvalStatus: s.approvalStatus,
      type: "DOCUMENTATION",
    });
  });

  // - Rejected sessions needing revision
  const rejectedSessions = mappedSessions.filter((s) => s.approvalStatus === "REJECTED");
  rejectedSessions.forEach((s) => {
    actionQueue.push({
      id: s.id,
      activityTitle: s.activityTitle,
      centerName: s.centerName,
      scheduledDate: s.scheduledDate,
      status: s.status,
      approvalStatus: s.approvalStatus,
      type: "REVISION",
      reason: s.notes, // Notes field contains rejection comment
    });
  });

  // Sort Action Queue by scheduled date asc so older items are shown first
  actionQueue.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  // 5. Progress Summary
  const volunteerSessions = sessions.filter((s) => s.activity?.isVolunteer && s.status !== "CANCELLED");
  const volunteerSessionsCount = volunteerSessions.length;
  const volunteerCompletedCount = volunteerSessions.filter((s) => s.status === "COMPLETED").length;
  const volunteerCompletionPercentage =
    volunteerSessionsCount > 0
      ? Math.round((volunteerCompletedCount / volunteerSessionsCount) * 100)
      : 0;

  return {
    overview: {
      centers: managedCenters,
      assignedProjects,
      totalSessions: totalCount,
      completedSessions: completedCount,
      delayedSessions: delayedCount,
      pendingApprovals: pendingApprovalsCount,
      completionPercentage,
    },
    sessions: mappedSessions,
    upcomingSessions,
    overdueSessions,
    actionQueue,
    progressSummary: {
      centerCompletionRate: completionPercentage,
      totalSessions: totalCount,
      completedSessions: completedCount,
      pendingApprovals: pendingApprovalsCount,
      volunteerSessionsCount,
      volunteerCompletedCount,
      volunteerCompletionPercentage,
    },
  };
}
