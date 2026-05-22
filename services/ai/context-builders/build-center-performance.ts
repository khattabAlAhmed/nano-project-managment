import { getCentersReport } from "@/services/reports/reports.service";

/**
 * Build context for center performance: strongest performing centers,
 * underperforming centers, and volunteer engagement.
 */
export async function buildCenterPerformanceContext(
  projectId: string
): Promise<string> {
  const centersReport = await getCentersReport(projectId, {});
  const centers = centersReport.centers;

  if (centers.length === 0) {
    return "## Center Performance Insights\n- No centers are assigned or active in this project.";
  }

  // Sort by completionRate descending (top performers)
  const sortedByCompletion = [...centers].sort((a, b) => b.completionRate - a.completionRate);

  // Top performing centers (completion rate >= 70% and assigned > 0)
  const strongest = sortedByCompletion.filter((c) => c.assignedSessions > 0 && c.completionRate >= 50);

  // Underperforming centers (completion rate < 50% or delayRate > 20%, assigned > 0)
  const underperforming = [...centers]
    .filter((c) => c.assignedSessions > 0)
    .sort((a, b) => a.completionRate - b.completionRate || b.delayRate - a.delayRate);

  // Sort by volunteerCompleted descending (volunteer engagement)
  const volunteerEngagement = [...centers]
    .filter((c) => c.volunteerSessions > 0)
    .sort((a, b) => b.volunteerCompleted - a.volunteerCompleted);

  const lines: string[] = ["## Center Performance Insights"];

  // 1. Full Centers Performance Matrix Table
  lines.push("\n### Physical Centers Matrix");
  lines.push(
    "| Center Name | City | Core Assigned | Core Completed | Core Delayed | Completion % | Delay Rate | Avg Turnaround |"
  );
  lines.push(
    "|-------------|------|---------------|----------------|--------------|--------------|------------|----------------|"
  );
  centers.forEach((c) => {
    const turnaround = c.avgApprovalTurnaroundHours !== null
      ? `${c.avgApprovalTurnaroundHours.toFixed(1)}h`
      : "N/A";
    lines.push(
      `| ${c.centerName} | ${c.city} | ${c.assignedSessions} | ${c.completedSessions} | ${c.delayedSessions} | **${c.completionRate}%** | **${c.delayRate}%** | ${turnaround} |`
    );
  });

  // 2. Strongest Performers
  lines.push("\n### Top Performing Branches");
  if (strongest.length > 0) {
    strongest.slice(0, 3).forEach((c) => {
      lines.push(
        `- **${c.centerName}** (${c.city}): High completion rate of **${c.completionRate}%** (${c.completedSessions} of ${c.assignedSessions} sessions).`
      );
    });
  } else {
    lines.push("- No centers have achieved high completion status yet.");
  }

  // 3. Underperforming / At-Risk Branches
  lines.push("\n### Underperforming or At-Risk Branches");
  const atRisk = underperforming.filter((c) => c.completionRate < 50 || c.delayRate > 20);
  if (atRisk.length > 0) {
    atRisk.slice(0, 3).forEach((c) => {
      lines.push(
        `- **${c.centerName}** (${c.city}): Completion rate at **${c.completionRate}%** with a delay rate of **${c.delayRate}%** (${c.delayedSessions} overdue sessions).`
      );
    });
  } else {
    lines.push("- All centers are performing well with low delay counts and solid progress!");
  }

  // 4. Volunteer Engagement
  lines.push("\n### Volunteer Initiative Engagement");
  if (volunteerEngagement.length > 0) {
    lines.push(
      "| Center Name | City | Volunteer Sessions | Volunteer Completed | Volunteer Completion % |"
    );
    lines.push(
      "|-------------|------|--------------------|---------------------|------------------------|"
    );
    volunteerEngagement.forEach((c) => {
      const volPct = c.volunteerSessions > 0
        ? Math.round((c.volunteerCompleted / c.volunteerSessions) * 100)
        : 0;
      lines.push(
        `| ${c.centerName} | ${c.city} | ${c.volunteerSessions} | ${c.volunteerCompleted} | **${volPct}%** |`
      );
    });
  } else {
    lines.push("- No volunteer sessions have been assigned to centers yet.");
  }

  return lines.join("\n");
}
