Read `AGENTS.md` before starting.

Expand support for volunteer activities and volunteer session tracking.

Volunteer activities are operationally separate from core required project activities.

However, they still contribute to:

- overall engagement
- center participation
- dashboard statistics

Volunteer activities must remain visible without corrupting core project progress calculations.

## Objective

Create a clear operational distinction between:

- required activities
- volunteer activities

while keeping both inside the same system architecture.

## Existing Foundation

The system already supports:

- `isVolunteer`

This feature expands workflow behavior and reporting visibility.

## Core Rules

Volunteer activities:

- appear separately in dashboards
- appear separately in reports
- contribute to engagement metrics
- must not replace required completion metrics

## Dashboard Enhancements

Update dashboards to display:

- volunteer sessions completed
- volunteer participation rates
- volunteer contribution by center

## Timeline Enhancements

Volunteer sessions must display visually distinct styling in:

- gantt timeline
- session tables

Use semantic tokens only.

No hardcoded colors.

## Filtering

Add volunteer filtering to:

- activities page
- sessions page
- dashboard widgets
- timeline view

## Analytics Preparation

Prepare reusable aggregation helpers for:

- volunteer participation
- volunteer completion rates
- center engagement rankings

## UI Requirements

Build:

- volunteer badges
- volunteer summary cards
- volunteer filters

## UX Rules

Volunteer work should feel:

- encouraged
- visible
- operationally respected

without confusing required execution metrics.

## Validation Rules

Volunteer activities still follow:

- approval workflows
- scheduling rules
- documentation requirements

Do not create separate execution systems.

## Constraints

Do not implement:

- volunteer rewards systems
- gamification
- public leaderboards

Focus only on operational volunteer tracking.

## Check When Done

- volunteer data separated correctly
- dashboards distinguish volunteer metrics
- timeline visually distinguishes volunteer sessions
- filtering works correctly
- progress calculations remain accurate
- `npm run build` passes