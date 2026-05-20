Read `AGENTS.md` before starting.

Build project activity management.

Activities are planning entities inside projects.

Activities later generate executable sessions distributed across centers.

An activity represents:

- a training
- workshop
- campaign
- event series
- operational initiative

Activities are NOT execution units.

Sessions are the execution units.

## Core Concepts

Each activity contains:

- title
- planned session count
- participating centers
- optional scheduling constraints
- volunteer flag

Activities belong to exactly one project.

## Backend

Create API routes:

### GET `/api/projects/[projectId]/activities`

List project activities.

### POST `/api/projects/[projectId]/activities`

Create activity.

### PATCH `/api/projects/[projectId]/activities/[activityId]`

Update activity.

### DELETE `/api/projects/[projectId]/activities/[activityId]`

Archive/delete activity.

Soft-delete preferred.

## Activity Fields

Support:

- title
- optional description
- plannedSessionCount
- participating centers
- optional startDate
- optional endDate
- isVolunteer

## Center Participation

Activities may target:

- all project centers
- selected centers only

This is critical.

Implement proper center assignment UI.

Store participation relationships explicitly.

Do not infer later.

## Scheduling Constraints

Allow optional:

- activity start date
- activity end date

Rules:

- activity dates must remain inside project date range
- dates are optional
- future scheduling engine will use them as constraints

## Validation Rules

Enforce:

- plannedSessionCount > 0
- activity dates inside project dates
- archived projects are readonly
- at least one participating center required

## UI Requirements

Build:

- activities table
- create activity dialog
- edit activity dialog
- delete/archive confirmation

## Activities Table

Display:

- activity title
- planned sessions count
- participating centers count
- volunteer status
- date constraints
- creation date

Support:

- search
- filtering
- empty states

## Volunteer Activities

Volunteer activities:

- contribute to overall progress
- remain operationally separate from core required activities

Implement as:

- boolean flag only

Do not create separate systems.

## Architecture Preparation

Prepare activity structure for future:

- session generation
- scheduling engine
- gantt timeline
- analytics

Do not implement execution logic yet.

## Constraints

Do not:

- generate sessions
- implement auto distribution
- implement timeline yet

Focus only on activity planning management.

## Check When Done

- activities CRUD works
- center participation works
- date validation enforced
- volunteer activities supported
- tables and dialogs functional
- `npm run build` passes