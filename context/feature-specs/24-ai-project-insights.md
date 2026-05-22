Read `AGENTS.md` before starting.

Expand the AI assistant with operational project insights.

The assistant should now analyze real project data and provide useful operational summaries.

AI must remain advisory only.

It cannot modify system state.

## Objective

Provide AI-generated operational insights using real project data.

The assistant should help project managers quickly understand:

- delays
- bottlenecks
- progress
- approval issues
- center performance

## Insight Categories

Support:

### Progress Summaries

Examples:

- overall completion status
- execution pace
- remaining workload

## Delay Analysis

Examples:

- overdue sessions
- delayed centers
- bottleneck activities

## Approval Analysis

Examples:

- pending approvals
- rejection trends
- slow approval turnaround

## Center Performance Insights

Examples:

- strongest performing centers
- underperforming centers
- volunteer engagement

## Timeline Health

Examples:

- scheduling concentration
- risky future periods
- execution imbalance

## Backend Architecture

Create reusable AI context builders.

Create:

- `services/ai/context-builders/`

Examples:

- `build-project-summary.ts`
- `build-delay-analysis.ts`
- `build-center-performance.ts`

## Prompt Architecture

Create reusable prompt templates.

Separate:

- system prompts
- context formatting
- user prompts

## AI Rules

The AI:

- must not hallucinate missing metrics
- must clearly reference operational data
- must not invent recommendations unsupported by data

## Response Style

Responses should feel:

- concise
- operational
- managerial

Avoid:

- excessive verbosity
- generic motivational language

## UI Enhancements

Add:

- quick insight action buttons
- suggested prompts
- insight categories

## Performance Rules

Avoid excessive database queries.

Reuse existing report aggregation services where possible.

## Security Rules

AI context must respect project membership and role permissions.

Never expose unrelated project data.

## Constraints

Do not implement:

- autonomous planning
- automated corrective actions
- AI scheduling decisions
- cross-project analytics
- embeddings memory systems

Focus only on operational AI insights.

## Check When Done

- AI responses use real project data
- insight prompts work correctly
- delays and approvals analyzed accurately
- permissions enforced correctly
- AI remains advisory-only
- `npm run build` passes