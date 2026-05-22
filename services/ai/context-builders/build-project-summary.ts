import { prisma } from "@/lib/prisma";
import { getOverviewReport } from "@/services/reports/reports.service";

/**
 * Build context for project progress: overall completion status,
 * execution pace, and remaining workload.
 */
export async function buildProjectSummaryContext(
  projectId: string
): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      description: true,
    },
  });

  if (!project) return "Project overview not available: Project not found.";

  // Reuse the optimized overview report service (with no filters)
  const report = await getOverviewReport(projectId, {});

  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const now = new Date();

  // 1. Calculate Execution Pace
  const totalDurationMs = endDate.getTime() - startDate.getTime();
  const totalDurationDays = Math.max(1, Math.ceil(totalDurationMs / (1000 * 60 * 60 * 24)));

  // Days elapsed since project start
  const elapsedMs = Math.max(0, now.getTime() - startDate.getTime());
  const elapsedDays = Math.max(1, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24)));
  const cappedElapsedDays = Math.min(totalDurationDays, elapsedDays);

  const completed = report.completedSessions;
  const remainingWorkload = report.totalSessions - completed - report.cancelledSessions;

  const avgCompletedPerDay = completed / cappedElapsedDays;
  const avgCompletedPerWeek = avgCompletedPerDay * 7;

  // Estimate completion
  let paceText = "";
  let etaText = "";
  
  if (completed === 0) {
    paceText = "0 sessions/week (Execution has not started or no sessions have been completed and approved yet)";
    etaText = "Unable to estimate completion date due to zero completed sessions.";
  } else if (remainingWorkload === 0) {
    paceText = `${avgCompletedPerWeek.toFixed(1)} sessions/week (Average)`;
    etaText = "All planned sessions have been successfully completed and approved!";
  } else {
    paceText = `${avgCompletedPerWeek.toFixed(1)} sessions/week (Average)`;
    const estDaysToComplete = remainingWorkload / avgCompletedPerDay;
    const estCompletionDate = new Date(now.getTime() + estDaysToComplete * (24 * 60 * 60 * 1000));
    
    const remainingDaysInProject = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    etaText = `Estimated completion in **${Math.ceil(estDaysToComplete)} days** (approx. ${estCompletionDate.toLocaleDateString()}). `;
    if (estDaysToComplete <= remainingDaysInProject) {
      etaText += `On track: Scheduled to finish **${remainingDaysInProject - Math.ceil(estDaysToComplete)} days before** the target deadline of ${endDate.toLocaleDateString()}.`;
    } else {
      etaText += `Warning: Projected to overshoot the target deadline of ${endDate.toLocaleDateString()} by **${Math.ceil(estDaysToComplete) - remainingDaysInProject} days** at the current execution pace. Rescheduling or capacity increases are advised.`;
    }
  }

  // Generate clean markdown section
  return `## Project Progress Summary
- **Project Name:** ${project.name}
- **Project Status:** ${project.status}
- **Duration:** ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} (${totalDurationDays} total days)
- **Description:** ${project.description || "No description provided."}

### Overall Session Stats
- **Total Planned Sessions:** ${report.totalSessions}
- **Completed & Approved:** ${report.completedSessions}
- **Pending Execution/Approval:** ${report.pendingSessions}
- **Overdue/Delayed:** ${report.delayedSessions}
- **Cancelled:** ${report.cancelledSessions}
- **Core Program Completion Progress:** ${report.coreCompletionPercentage}%
- **Volunteer Initiative Completion Progress:** ${report.volunteerCompletionPercentage}%

### Execution Pace & Forecast
- **Execution Pace:** ${paceText}
- **Remaining Workload:** ${remainingWorkload} active sessions (excluding cancelled)
- **Estimated Completion:** ${etaText}`;
}
