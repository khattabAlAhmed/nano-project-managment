Read `AGENTS.md` before starting.

Build the session execution and documentation workflow.

Sessions are the core operational execution units of the platform.

Center managers must be able to:

- execute sessions
- mark progress
- upload documentation links
- submit sessions for approval

This workflow powers real project progress tracking.

## Objective

Implement the full execution lifecycle for sessions.

## Session Lifecycle

Supported states:

### Session Status

- PENDING
- IN_PROGRESS
- COMPLETED
- DELAYED
- CANCELLED

### Approval Status

- NOT_SUBMITTED
- PENDING_APPROVAL
- APPROVED
- REJECTED

## Execution Rules

Center managers can:

- start sessions
- complete sessions
- submit documentation
- submit approval requests

Center managers cannot:

- approve sessions
- modify scheduling
- edit project planning

## Documentation Rules

Each session supports:

- one Google Drive documentation URL

Store:

- URL only

Do not upload files internally.

## API Routes

Create:

### PATCH `/api/sessions/[sessionId]/execute`

Supports:

- status updates
- notes
- documentation URL
- approval submission

## Validation Rules

Enforce:

- only assigned center manager can execute session
- documentation URL required before approval submission
- completed sessions cannot revert without permission
- archived projects readonly

## UI Requirements

Build:

- session execution dialog/page
- execution status controls
- documentation input
- submission flow

## Sessions Table Enhancements

Add operational actions:

- Start Session
- Mark Completed
- Submit for Approval

## UX Rules

Execution workflow must feel fast and operational.

Avoid:

- long forms
- multi-step wizards
- excessive confirmations

## Delayed Session Logic

Automatically detect delayed sessions when:

- scheduled date passes
- session remains incomplete

Prepare reusable delayed-state helpers.

## Progress Updates

Session completion must immediately affect:

- project progress
- center progress
- dashboard metrics

Use real database state.

## Constraints

Do not implement:

- approval actions
- rejection flows
- reporting exports

Those belong to the next feature.

## Check When Done

- center managers can execute sessions
- documentation links stored correctly
- approval submission works
- delayed session detection works
- dashboard metrics update correctly
- `npm run build` passes