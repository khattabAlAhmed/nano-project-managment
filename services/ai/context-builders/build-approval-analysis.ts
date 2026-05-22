import { prisma } from "@/lib/prisma";
import { getOverviewReport, getCentersReport } from "@/services/reports/reports.service";

/**
 * Build context for approvals: pending approvals, rejection trends,
 * and slow approval turnaround.
 */
export async function buildApprovalAnalysisContext(
  projectId: string
): Promise<string> {
  // 1. Fetch pending reviews queue (oldest 5)
  const pendingQueue = await prisma.session.findMany({
    where: {
      projectId,
      approvalStatus: "PENDING_APPROVAL",
    },
    orderBy: { submittedAt: "asc" },
    take: 5,
    select: {
      id: true,
      submittedAt: true,
      notes: true,
      documentationUrl: true,
      activity: { select: { title: true } },
      center: {
        select: {
          name: true,
          city: true,
        },
      },
    },
  });

  // 2. Fetch recent rejection records to analyze rejection trends
  const recentRejections = await prisma.approvalRecord.findMany({
    where: {
      session: { projectId },
      status: "REJECTED",
    },
    orderBy: { reviewedAt: "desc" },
    take: 5,
    select: {
      reviewNotes: true,
      reviewedAt: true,
      session: {
        select: {
          activity: { select: { title: true } },
          center: { select: { name: true } },
        },
      },
    },
  });

  // 3. Fetch overview and center reports to get turnaround/compliance rates
  const overview = await getOverviewReport(projectId, {});
  const centersReport = await getCentersReport(projectId, {});

  // Calculate overall average turnaround time across all centers
  const turnarounds = centersReport.centers
    .map((c) => c.avgApprovalTurnaroundHours)
    .filter((t): t is number => t !== null);
  const avgTurnaround = turnarounds.length > 0
    ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
    : null;

  const lines: string[] = ["## Approval & Audit Analysis"];

  // Core metrics
  lines.push(`- **Pending PM Review Queue Size:** ${overview.pendingApprovalCount}`);
  lines.push(`- **Total Approved Sessions:** ${overview.approvedCount}`);
  lines.push(`- **Total Rejected Sessions:** ${overview.rejectedCount}`);
  lines.push(`- **Historical Approval Rate:** ${overview.approvalRate}% (of decided reviews)`);
  lines.push(
    `- **Average Review Turnaround Time:** ${
      avgTurnaround !== null ? `${avgTurnaround.toFixed(1)} hours` : "No historical turnaround data"
    }`
  );
  lines.push(`- **Google Drive Documentation Compliance Rate:** ${overview.documentationRate}%`);
  lines.push(`- **Completed Sessions Awaiting Documentation:** ${overview.missingDocumentationCount}`);

  // Oldest Pending approvals queue
  lines.push("\n### Pending Audits Queue (Oldest Items)");
  if (pendingQueue.length > 0) {
    pendingQueue.forEach((s, idx) => {
      const submittedDate = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : "Unknown";
      lines.push(
        `${idx + 1}. **${s.activity?.title || "Unknown"}** at **${s.center?.name || "Unassigned"}** — Submitted on **${submittedDate}**`
      );
      if (s.notes) {
        lines.push(`   - *Manager Notes:* "${s.notes}"`);
      }
      lines.push(`   - *Drive Link:* ${s.documentationUrl || "None provided"}`);
    });
  } else {
    lines.push("- The audit queue is completely empty! All executed sessions are reviewed.");
  }

  // Rejection trends
  lines.push("\n### Rejection & Revision Feedback Trends");
  if (recentRejections.length > 0) {
    recentRejections.forEach((r, idx) => {
      const date = new Date(r.reviewedAt).toLocaleDateString();
      lines.push(
        `${idx + 1}. **${r.session?.activity?.title || "Unknown"}** at **${r.session?.center?.name || "Unassigned"}** (${date})`
      );
      lines.push(`   - *Rejection Reason:* "${r.reviewNotes || "No notes logged"}"`);
    });
  } else {
    lines.push("- No sessions have been rejected recently. Quality parameters are being met.");
  }

  return lines.join("\n");
}
