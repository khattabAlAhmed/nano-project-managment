# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Complete

## Current Goal

- Feature 05: Project Management — ✅ Completed

## Completed

- Feature 01: Design System
- Feature 02: App Shell & Navigation
- Feature 03: Auth & Role Foundation
- Feature 04: Prisma Schema Core
- Feature 05: Project Management
  - [x] Implement GET `/api/projects`
  - [x] Implement POST `/api/projects`
  - [x] Implement PATCH `/api/projects/[projectId]`
  - [x] Implement DELETE `/api/projects/[projectId]` (archives project)
  - [x] Enforce project status and authentication/authorization rules (PROJECT_MANAGER allowed to create, owner allowed to archive, archived readonly)
  - [x] Create/edit project dialogs in UI using base-ui dialog components
  - [x] Archive project dialog in UI using base-ui alert-dialog
  - [x] Connect ProjectSelector with real API data
  - [x] Setup empty states for no projects / archived-only projects
  - [x] Verify `npm run build` passes

## In Progress

- None.

## Next Up

- Feature 06

## Open Questions

- None.

## Architecture Decisions

- Feature 01: shadcn base-nova, Tailwind v4, oklch tokens
- Feature 02: `(app)` route group, base-ui render prop, Clerk proxy.ts
- Feature 03: Roles in Clerk publicMetadata, server auth helpers in lib/auth.ts
- Feature 04: PostgreSQL via Prisma Postgres, modular schema files in prisma/models/, prisma.config.ts for CLI config, Prisma v7 Pg driver adapter
- Feature 05: REST API endpoints in app/api/projects/, Client-side ProjectProvider state preservation in localStorage, dynamic CRUD modals integrated directly in navbar and project selector, custom empty states for dashboard. Modified `prisma.config.ts` to use `"prisma"` directory recursively for GA schema folder compilation.
