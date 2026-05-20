# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- Complete

## Current Goal

- Feature 03: Auth & Role Foundation — ✅ Completed

## Completed

- Feature 01: Design System (shadcn/ui, tokens, theme, fonts, RTL foundations, layout standards)
- Feature 02: App Shell & Navigation (shell layout, sidebar, navbar, project selector, 9 placeholder routes, Clerk integration)
- Feature 03: Auth & Role Foundation
  - [x] ClerkProvider wraps root layout with shadcn theme (F02)
  - [x] proxy.ts protects all routes except /, /sign-in, /sign-up (F02)
  - [x] UserButton in navbar (F02)
  - [x] Dark/light Clerk theme compatibility (F02)
  - [x] Root `/` redirect (authenticated → /dashboard, unauthenticated → /sign-in)
  - [x] Sign-in page with split layout (`(auth)/sign-in/[[...sign-in]]`)
  - [x] Sign-up page with split layout (`(auth)/sign-up/[[...sign-up]]`)
  - [x] Auth layout with desktop split design (branding + form), mobile form-only
  - [x] `types/roles.ts` — Role enum (PROJECT_MANAGER, CENTER_MANAGER, VIEWER), Permission type, ROLE_PERMISSIONS mapping, helpers
  - [x] `lib/auth.ts` — getCurrentUser, requireAuth, requireRole, requirePermission, getAuthUserId, extractRole
  - [x] `npm run build` passes with zero errors (13 routes compiled)

## In Progress

- None.

## Next Up

- Feature 04 (next feature spec)

## Open Questions

- None currently.

## Architecture Decisions

- Feature 01: shadcn base-nova style, Tailwind v4, Inter + Cairo fonts, oklch tokens
- Feature 02: Route group `(app)` for shell-wrapped routes; base-ui `render` prop pattern; Clerk proxy.ts
- Feature 03: Roles stored in Clerk publicMetadata, defaults to VIEWER; server-side auth helpers in `lib/auth.ts`; auth pages in `(auth)` route group with split layout; root page is a server component that redirects based on auth state

## Session Notes

- Auth infrastructure was largely set up in Feature 02 — Feature 03 added auth pages, root redirect, and role architecture
- Role permissions are defined as a static mapping in `types/roles.ts` — extensible for future RBAC
- Auth helpers use `@clerk/nextjs/server` (auth, currentUser) — server-side only
