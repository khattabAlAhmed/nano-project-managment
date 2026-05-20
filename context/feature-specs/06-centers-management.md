Read `AGENTS.md` before starting.

Build center management.

Centers represent operational branches/cities participating in projects.

Centers are reusable entities across multiple projects.

Each center has an assigned center manager.

This feature establishes operational geography and assignment structure.

## Core Requirements

Support:

- center creation
- center editing
- center assignment to managers
- center listing
- center archival

Centers are NOT project-specific.

Projects later attach participating centers through `ProjectCenter`.

## API Routes

Create:

### GET `/api/centers`

List centers visible to current user.

### POST `/api/centers`

Create center.

### PATCH `/api/centers/[centerId]`

Update center.

### DELETE `/api/centers/[centerId]`

Archive center.

Do not hard delete centers.

## Center Fields

Support:

- center name
- city
- assigned center manager

Prepare for future metadata expansion.

Do not over-model yet.

## Permissions

Only project managers can:

- create centers
- edit centers
- archive centers

Center managers:

- readonly access to their assigned center

Viewers:

- readonly access only

## UI Requirements

Create:

- centers page
- center table
- create center dialog
- edit center dialog
- archive confirmation dialog

## Table Requirements

Display:

- center name
- city
- assigned manager
- active projects count (placeholder for now)
- status

Support:

- search
- empty states
- loading states

Pagination not required yet.

## Manager Assignment

Center manager assignment must use real users.

Prepare searchable manager selector.

Temporary implementation allowed:

- basic dropdown selector

Do not build invitation flows yet.

## Archive Rules

Archived centers:

- remain visible historically
- cannot receive new project assignments

Do not remove historical relationships.

## Constraints

Do not:

- build project-center assignment yet
- build activity distribution yet
- build scheduling logic yet

Focus only on reusable center management.

## Check When Done

- centers CRUD works
- permissions enforced correctly
- center manager assignment works
- archive flow works
- centers page functional
- `npm run build` passes