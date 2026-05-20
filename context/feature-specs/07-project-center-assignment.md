Read `AGENTS.md` before starting.

Build project-center assignment management.

Projects operate through participating centers.

A project may include:

- one center
- multiple centers
- different center managers per project

This feature establishes the operational project scope before activities and scheduling begin.

## Objective

Allow project managers to:

- attach centers to projects
- remove centers from projects
- view participating centers per project

This relationship powers:

- activity distribution
- session scheduling
- progress tracking
- reporting
- notifications

## Backend

Use existing:

- `ProjectCenter` model

Create API routes:

### GET `/api/projects/[projectId]/centers`

Returns all centers assigned to project.

### POST `/api/projects/[projectId]/centers`

Assign center to project.

### DELETE `/api/projects/[projectId]/centers/[centerId]`

Remove center from project.

## Validation Rules

Enforce:

- archived projects are readonly
- archived centers cannot be assigned
- duplicate assignments are forbidden
- only PROJECT_MANAGER can mutate assignments

Return:

- `401` unauthenticated
- `403` unauthorized
- `404` invalid project/center

## UI Requirements

Build:

- project centers management section
- assign center dialog
- remove assignment confirmation

Integrate inside:

- project settings page OR project details section

Do not create a standalone management app.

## Center Assignment Table

Display:

- center name
- city
- assigned manager
- assignment date
- current status

Support:

- search
- empty states
- loading states

## Assignment Flow

Assignment UX should be operational and fast.

Requirements:

- searchable center selector
- exclude already assigned centers
- prevent archived centers selection

## Project Context Integration

Assigned centers must sync with:

- project context
- future scheduling flows
- future activity distribution logic

Prepare reusable data helpers.

## Constraints

Do not:

- generate sessions yet
- distribute activities yet
- build center-specific dashboards yet

Focus only on assignment infrastructure.

## Check When Done

- centers can be assigned to projects
- duplicate assignments prevented
- archived centers blocked
- removal flow works
- permissions enforced correctly
- `npm run build` passes