/**
 * Central AI context builder exports and full aggregator.
 *
 * Imports modular sub-builders from services/ai/context-builders/ and
 * aggregates them in parallel for the full AI chat experience.
 */

import { buildProjectSummaryContext } from "./context-builders/build-project-summary";
import { buildDelayAnalysisContext } from "./context-builders/build-delay-analysis";
import { buildCenterPerformanceContext } from "./context-builders/build-center-performance";
import { buildApprovalAnalysisContext } from "./context-builders/build-approval-analysis";
import { buildTimelineHealthContext } from "./context-builders/build-timeline-health";

export {
  buildProjectSummaryContext,
  buildDelayAnalysisContext,
  buildCenterPerformanceContext,
  buildApprovalAnalysisContext,
  buildTimelineHealthContext,
};

/**
 * Build a comprehensive project context by running all modular context
 * queries in parallel using Promise.all.
 */
export async function buildFullProjectContext(
  projectId: string
): Promise<string> {
  const [progress, delays, centers, approvals, timeline] = await Promise.all([
    buildProjectSummaryContext(projectId),
    buildDelayAnalysisContext(projectId),
    buildCenterPerformanceContext(projectId),
    buildApprovalAnalysisContext(projectId),
    buildTimelineHealthContext(projectId),
  ]);

  return [progress, delays, centers, approvals, timeline]
    .filter(Boolean)
    .join("\n\n");
}
