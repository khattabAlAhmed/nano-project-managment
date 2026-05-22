import { getTimelineReport, getCentersReport } from "@/services/reports/reports.service";

/**
 * Build context for timeline health: scheduling concentration,
 * risky future periods, and execution imbalance.
 */
export async function buildTimelineHealthContext(
  projectId: string
): Promise<string> {
  const timeline = await getTimelineReport(projectId, {});
  const centersReport = await getCentersReport(projectId, {});

  const buckets = timeline.weeklyBuckets;
  const centers = centersReport.centers;

  if (buckets.length === 0) {
    return "## Timeline Health Analysis\n- No timeline scheduling exists for this project.";
  }

  // 1. Calculate scheduling concentration
  const totalScheduled = timeline.totalScheduled;
  const avgSessionsPerWeek = totalScheduled / buckets.length;

  const concentrationWeeks = buckets
    .filter((w) => w.totalSessions > avgSessionsPerWeek * 1.5)
    .sort((a, b) => b.totalSessions - a.totalSessions);

  // 2. Identify risky future peak workloads
  const upcomingPeakWeeks = buckets
    .filter((w) => {
      // Future week or current week with significant remaining sessions
      // Since weeklyBuckets doesn't split completed/overdue vs upcoming directly except by count:
      // A week is risky if it has a high total count but low completed count
      const activePending = w.totalSessions - w.completedSessions - w.overdueSessions;
      return activePending > avgSessionsPerWeek * 1.2;
    })
    .sort((a, b) => (b.totalSessions - b.completedSessions) - (a.totalSessions - a.completedSessions));

  // 3. Execution load imbalance across centers
  let loadImbalanceText = "";
  if (centers.length > 1) {
    const coreAssignedCounts = centers.map((c) => c.assignedSessions);
    const maxAssigned = Math.max(...coreAssignedCounts);
    const minAssigned = Math.min(...coreAssignedCounts);
    const averageAssigned = coreAssignedCounts.reduce((a, b) => a + b, 0) / centers.length;

    if (maxAssigned - minAssigned > averageAssigned * 0.5) {
      loadImbalanceText = `Warning: High execution load imbalance detected between branches. Max load is **${maxAssigned} sessions** (assigned to top branch) while min load is only **${minAssigned} sessions**. Core average load is **${averageAssigned.toFixed(1)} sessions/center**. Perfect load balance is not achieved.`;
    } else {
      loadImbalanceText = "Healthy: Core operational loads are balanced and distributed relatively evenly across participating branches.";
    }
  } else {
    loadImbalanceText = "Not applicable: Only one operational branch is participating in this project container.";
  }

  const lines: string[] = ["## Timeline & Scheduling Health"];

  lines.push(`- **Total Scheduled Planning Items:** ${totalScheduled}`);
  lines.push(`- **Total Overdue Scheduling Slips:** ${timeline.totalOverdue}`);
  lines.push(`- **Critical Bottleneck Periods:** ${timeline.bottleneckWeeks.join(", ") || "None identified"}`);
  lines.push(`- **Operational Load Balance:** ${loadImbalanceText}`);

  // Peak Concentration
  lines.push("\n### Peak Scheduling Concentration Weeks");
  if (concentrationWeeks.length > 0) {
    concentrationWeeks.slice(0, 3).forEach((w) => {
      lines.push(
        `- **Week of ${w.weekLabel}**: **${w.totalSessions} sessions** scheduled (Average is ${avgSessionsPerWeek.toFixed(1)}/week). This represents a peak density concentration of **${Math.round((w.totalSessions / avgSessionsPerWeek) * 100)}%**.`
      );
    });
  } else {
    lines.push("- Session distribution is evenly distributed without sharp peaks.");
  }

  // Risky future peak periods
  lines.push("\n### High Upcoming Peak Workloads");
  if (upcomingPeakWeeks.length > 0) {
    upcomingPeakWeeks.slice(0, 3).forEach((w) => {
      const remaining = w.totalSessions - w.completedSessions - w.overdueSessions;
      lines.push(
        `- **Week of ${w.weekLabel}**: **${remaining} remaining sessions** left to execute out of ${w.totalSessions} total. High risk of center capacity strain.`
      );
    });
  } else {
    lines.push("- No upcoming high-density bottleneck weeks are projected.");
  }

  return lines.join("\n");
}
