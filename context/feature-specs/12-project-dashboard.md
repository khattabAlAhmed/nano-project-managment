Read `AGENTS.md` before starting.

Build the operational project dashboard.

The dashboard is the primary monitoring surface for project managers.

It must provide immediate visibility into:

- project progress
- execution health
- delays
- approvals
- center performance
- scheduling status

The dashboard should feel operational and data-driven.

Avoid marketing-style analytics.

## Objective

Create a real project dashboard powered entirely by live database data.

No fake metrics.

No placeholder charts.

## Dashboard Sections

Build dashboard widgets for:

### Project Overview

Display:

- project status
- project duration
- participating centers
- total activities
- total sessions

## Progress Overview

Display:

- completed sessions
- pending sessions
- delayed sessions
- approval queue count

Calculate real percentages from stored data.

## Timeline Health

Display:

- upcoming sessions
- overdue sessions
- today’s sessions

## Center Performance

Display per-center:

- assigned sessions
- completed sessions
- delayed sessions
- completion percentage

## Volunteer Activity Summary

Display:

- volunteer sessions count
- volunteer completion progress

Volunteer work contributes separately without replacing core progress.

## Recent Operational Activity

Display recent:

- approvals
- session completions
- schedule adjustments

## Backend

Create reusable dashboard query services.

Create:

- `services/dashboard/`

Keep aggregation logic outside route handlers.

## API Routes

Create:

### GET `/api/projects/[projectId]/dashboard`

Returns aggregated dashboard data.

## Performance Rules

Optimize queries carefully.

Avoid:

- excessive nested Prisma queries
- loading unnecessary relations

Use aggregate queries where possible.

## UI Requirements

Use:

- cards
- tables
- lightweight charts only where useful

Recommended:

- progress bars
- compact operational summaries
- simple trend indicators

Do not build advanced analytics dashboards yet.

## Empty States

Handle:

- projects without sessions
- projects without activities
- newly created projects

## Responsive Rules

Dashboard must remain usable on:

- desktop
- tablets

Mobile support should remain functional but simplified.

## Constraints

Do not implement:

- gantt timeline yet
- advanced analytics
- exports
- AI summaries

Focus only on operational monitoring.

## Check When Done

- dashboard uses real data
- progress calculations accurate
- delayed sessions detected correctly
- center metrics accurate
- aggregation queries optimized
- `npm run build` passes