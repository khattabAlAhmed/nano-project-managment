Read `AGENTS.md` before starting.

Clerk is already installed and connected.

Wire authentication, protected routing, and role architecture foundations into the application.

This system has three operational roles:

- PROJECT_MANAGER
- CENTER_MANAGER
- VIEWER

Permissions will later drive:

- project planning access
- scheduling access
- approvals
- reporting visibility
- execution permissions

Build the role foundation carefully.

## Authentication Setup

Wrap the root application with:

- `ClerkProvider`

Use Clerk theme integration compatible with the app theme system.

Requirements:

- dark mode compatibility
- light mode compatibility
- CSS variable compatibility

Do not hardcode colors.

## Protected Routing

Use:

- `proxy.ts`

Do NOT use:

- `middleware.ts`

Public routes:

- `/sign-in`
- `/sign-up`

Protect everything else by default.

## Root Redirect Logic

Update `/` behavior:

Authenticated users:

- redirect to `/dashboard`

Unauthenticated users:

- redirect to `/sign-in`

## Auth Pages

Create:

- sign-in page
- sign-up page

Layout requirements:

Desktop:

- split layout
- minimal branding section
- centered auth form

Mobile:

- auth form only

Avoid:

- marketing hero sections
- gradients
- oversized feature lists
- decorative cards

The visual tone must remain:

- professional
- operational
- minimal

## User Menu

Add Clerk `UserButton` to navbar.

Keep default Clerk account flows intact.

Do not rebuild:

- profile management
- session management
- logout flows

## Role Architecture Foundation

Create:

- `types/roles.ts`
- `lib/auth.ts`

Prepare reusable helpers for:

- role checks
- permission guards
- authenticated user access

Do not hardcode role checks inside UI components.

## Future Compatibility

The auth foundation must support future:

- project-scoped permissions
- center-scoped permissions
- approval permissions
- readonly viewer restrictions

Do not implement full RBAC yet.

Only prepare extensible architecture.

## Constraints

Do not:

- store roles in local state
- duplicate Clerk session logic
- build custom auth systems
- create custom profile pages

## Check When Done

- authentication works end-to-end
- all protected routes require auth
- root redirects work correctly
- ClerkProvider wraps the app correctly
- UserButton renders correctly
- role helper structure exists
- dark/light themes work with Clerk
- `npm run build` passes