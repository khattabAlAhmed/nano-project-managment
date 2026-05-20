Read `AGENTS.md` before starting.

Build the full session approval workflow.

Project managers must review submitted sessions before they officially count as approved operational execution.

This workflow is critical for:

- progress accuracy
- documentation verification
- execution quality control
- reporting integrity

The approval system must remain operational, fast, and audit-friendly.

## Objective

Allow project managers to:

- review submitted sessions
- approve sessions
- reject sessions
- provide rejection notes

Approval decisions must immediately affect project metrics and dashboards.

## Approval Rules

Only:

- PROJECT_MANAGER

can approve or reject sessions.

Center managers cannot self-approve.

## Approval States

Supported states:

- NOT_SUBMITTED
- PENDING_APPROVAL
- APPROVED
- REJECTED

## Approval Lifecycle

### Submission

Center manager submits completed session.

State becomes:

- PENDING_APPROVAL

## Approval

Project manager approves session.

State becomes:

- APPROVED

## Rejection

Project manager rejects session.

State becomes:

- REJECTED

Center manager may later revise and resubmit.

## Database Requirements

Use existing:

- `ApprovalRecord`

Ensure every approval/rejection creates historical approval records.

Do not overwrite approval history.

## API Routes

Create:

### GET `/api/projects/[projectId]/approvals`

Returns approval queue.

### PATCH `/api/sessions/[sessionId]/approval`

Supports:

- approve
- reject
- review notes

## Validation Rules

Enforce:

- only submitted sessions can be reviewed
- rejected sessions require review notes
- archived projects are readonly
- only project managers can review

## Dashboard Integration

Approval decisions must immediately update:

- project progress
- center progress
- approval queue counts
- delayed metrics

## UI Requirements

Build:

- approvals page
- approval queue table
- review dialog
- approval history preview

## Approval Queue Table

Display:

- activity
- center
- scheduled date
- submission date
- session status
- documentation link
- approval state

Support:

- filtering
- search
- approval-state filtering
- overdue filtering

## Review Dialog

Allow project manager to:

- preview session details
- open Google Drive documentation
- approve
- reject with notes

## UX Rules

Approval flow must support rapid operational review.

Avoid:

- page reloads
- deep nested navigation
- multi-step approval flows

## Notification Hooks

Prepare reusable notification triggers for:

- approval success
- rejection
- pending review reminders

Do not implement notification delivery yet.

## Constraints

Do not implement:

- multi-level approvals
- bulk approvals
- AI approval summaries
- exports

Focus only on the operational approval workflow.

## Check When Done

- approvals work end-to-end
- approval history persists correctly
- rejection notes enforced
- approval metrics update correctly
- permissions enforced correctly
- `npm run build` passes