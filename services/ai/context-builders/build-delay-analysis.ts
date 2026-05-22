import { prisma } from "@/lib/prisma";
import { getOverviewReport, getCentersReport } from "@/services/reports/reports.service";

/**
 * Build context for delays: overdue sessions, delayed centers,
 * and bottleneck activities.
 */
export async function buildDelayAnalysisContext(
  projectId: string
): Promise<string> {
  const now = new Date();

  // 1. Fetch up to 5 oldest overdue sessions
  const overdueSessions = await prisma.session.findMany({
    where: {
      projectId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      scheduledDate: { lt: now },
    },
    orderBy: { scheduledDate: "asc" },
    take: 5,
    select: {
      scheduledDate: true,
      status: true,
      activity: { select: { title: true } },
      center: {
        select: {
          name: true,
          city: true,
          manager: { select: { email: true } },
        },
      },
    },
  });

  // 2. Fetch center metrics to identify delayed centers
  const centersReport = await getCentersReport(projectId, {});
  const delayedCenters = [...centersReport.centers]
    .filter((c) => c.delayedSessions > 0)
    .sort((a, b) => b.delayedSessions - a.delayedSessions);

  // 3. Fetch activity breakdown to identify bottleneck activities
  const overviewReport = await getOverviewReport(projectId, {});
  const bottleneckActivities = [...overviewReport.activityBreakdown]
    .filter((a) => a.delayedSessions > 0)
    .sort((a, b) => b.delayedSessions - a.delayedSessions);

  const lines: string[] = ["## Delay & Bottleneck Analysis"];

  // Total overdue count
  const totalOverdue = overviewReport.delayedSessions;
  lines.push(`- **Total Overdue/Delayed Sessions:** ${totalOverdue}`);

  // Oldest Overdue Sessions List
  lines.push("\n### Oldest Overdue Sessions (Critical)");
  if (overdueSessions.length > 0) {
    overdueSessions.forEach((s, idx) => {
      const managerEmail = s.center?.manager?.email || "No Manager Assigned";
      lines.push(
        `${idx + 1}. **${s.activity?.title || "Unknown"}** at **${s.center?.name || "Unassigned"}** (${s.center?.city || "Unknown"}) — Scheduled **${new Date(s.scheduledDate).toLocaleDateString()}** (Assigned Manager: ${managerEmail})`
      );
    });
  } else {
    lines.push("- No overdue sessions found! Excellent timeline compliance.");
  }

  // Delayed Centers
  lines.push("\n### Delayed & Overdue Centers");
  if (delayedCenters.length > 0) {
    lines.push("| Center | City | Delayed Sessions | Total Assigned | Delay Rate |");
    lines.push("|--------|------|------------------|----------------|------------|");
    delayedCenters.forEach((c) => {
      lines.push(
        `| ${c.centerName} | ${c.city} | **${c.delayedSessions}** | ${c.assignedSessions} | **${c.delayRate}%** |`
      );
    });
  } else {
    lines.push("- All physical centers are executing their sessions on schedule.");
  }

  // Bottleneck Activities
  lines.push("\n### Bottleneck Activities");
  if (bottleneckActivities.length > 0) {
    lines.push("| Activity Title | Scope | Delayed Sessions | Total Planned | Completion % |");
    lines.push("|----------------|-------|------------------|---------------|--------------|");
    bottleneckActivities.forEach((a) => {
      const scopeLabel = a.isVolunteer ? "Volunteer" : "Core";
      lines.push(
        `| ${a.activityTitle} | ${scopeLabel} | **${a.delayedSessions}** | ${a.totalSessions} | ${a.completionPercentage}% |`
      );
    });
  } else {
    lines.push("- No specific activities are experiencing delay blockages.");
  }

  return lines.join("\n");
}
