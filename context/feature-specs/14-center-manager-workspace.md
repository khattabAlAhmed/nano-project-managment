Read `AGENTS.md` before starting.

Build the dedicated Center Manager operational workspace.

Center managers are responsible for:

- viewing assigned sessions
- executing sessions
- uploading documentation
- monitoring local progress

This workspace must be operationally focused and simplified compared to the project manager dashboard.

## Objective

Create a center-scoped operational interface.

Center managers should only see:

- their assigned center
- their assigned sessions
- their required actions

## Access Rules

Center managers must NOT access:

- global project administration
- scheduling controls
- center assignment management
- project-wide editing

Enforce server-side permission checks.

## Dashboard Sections

Build:

### Center Overview

Display:

- assigned projects
- upcoming sessions
- overdue sessions
- completion percentage

## Assigned Sessions

Display sessions assigned to the manager’s center.

Include:

- activity
- session date
- status
- approval state

## Action Queue

Highlight:

- sessions requiring execution
- sessions awaiting documentation
- rejected sessions needing revision

## Progress Summary

Display:

- center completion rate
- volunteer contribution
- pending approvals

## Backend

Create:

- center-scoped query helpers
- reusable permission guards

Create:

- `services/center-dashboard/`

## API Routes

Create:

### GET `/api/center/dashboard`

Returns center-scoped operational data.

## UI Requirements

Build:

- operational dashboard
- assigned sessions table
- quick action buttons

## UX Rules

The workspace must prioritize:

- clarity
- task completion
- operational speed

Avoid analytics-heavy layouts.

## Filtering

Support filtering by:

- session status
- approval state
- upcoming dates

## Responsive Rules

Must work well on:

- laptops
- tablets

Mobile support should remain functional.

## Constraints

Do not implement:

- execution forms yet
- approvals yet
- timeline editing
- reporting exports

Focus only on center-scoped operational visibility.

## Check When Done

- center managers only see assigned data
- permissions enforced correctly
- assigned sessions render correctly
- operational dashboard functional
- `npm run build` passes