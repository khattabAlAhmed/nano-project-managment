Read `AGENTS.md` before starting.

Build project management backend flows and initial project management UI.

Projects are the top-level operational container for:

- centers
- activities
- sessions
- approvals
- notifications
- reports

This feature establishes the project lifecycle foundation.

## Project Lifecycle

Support project statuses:

- DRAFT
- ACTIVE
- ARCHIVED

Rules:

- archived projects are readonly
- only project managers can create projects
- only project owners can archive projects

## API Routes

Create REST API routes:

### GET `/api/projects`

Returns projects visible to current user.

### POST `/api/projects`

Creates new project.

### PATCH `/api/projects/[projectId]`

Updates project metadata.

### DELETE `/api/projects/[projectId]`

Archives project instead of hard delete.

Do NOT permanently delete projects.

## Authentication Rules

All routes require authentication.

Use Clerk authenticated user ID.

Unauthenticated:

- return `401`

Unauthorized:

- return `403`

## Validation

Validate:

- project name required
- startDate < endDate
- archived projects cannot be edited

Default project name:

- Untitled Project

## Project Ownership

Project owner:

- full access
- archive permissions
- future scheduling permissions

## UI Requirements

Build:

- create project dialog
- edit project dialog
- archive confirmation dialog

Fields:

- project name
- description
- start date
- end date

## Project List

Replace placeholder project selector data with real backend data.

Project selector must display:

- active projects
- archived projects

Group projects visually by status.

## Empty States

Create proper empty states for:

- no projects
- archived-only state

## UX Rules

Avoid:

- wizard flows
- multi-step forms
- heavy onboarding

Project creation should be fast and operational.

## Constraints

Do not:

- build activities yet
- build scheduling yet
- build reports yet

Focus only on project lifecycle management.

## Check When Done

- project CRUD works
- archive flow works
- project selector uses real data
- ownership checks enforced
- archived projects readonly
- `npm run build` passes