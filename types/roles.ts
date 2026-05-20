/**
 * Application roles — stored in Clerk user publicMetadata.
 *
 * Roles drive access control across the system:
 * - PROJECT_MANAGER: full project access, planning, approvals, reporting, AI
 * - CENTER_MANAGER: assigned center execution, documentation, volunteer activities
 * - VIEWER: read-only access to dashboards and reports
 */
export enum Role {
  PROJECT_MANAGER = "PROJECT_MANAGER",
  CENTER_MANAGER = "CENTER_MANAGER",
  VIEWER = "VIEWER",
}

/** All valid role values as an array for runtime validation */
export const ALL_ROLES = Object.values(Role);

/**
 * Permission categories — will be expanded as features are built.
 * Currently serves as the foundation for future RBAC checks.
 */
export type Permission =
  | "project:create"
  | "project:edit"
  | "project:delete"
  | "project:view"
  | "activity:create"
  | "activity:edit"
  | "activity:view"
  | "session:execute"
  | "session:approve"
  | "session:view"
  | "center:manage"
  | "center:view"
  | "report:view"
  | "report:export"
  | "notification:send"
  | "settings:edit";

/**
 * Role-to-permission mapping — defines what each role can do.
 * This is the single source of truth for permission checks.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.PROJECT_MANAGER]: [
    "project:create",
    "project:edit",
    "project:delete",
    "project:view",
    "activity:create",
    "activity:edit",
    "activity:view",
    "session:execute",
    "session:approve",
    "session:view",
    "center:manage",
    "center:view",
    "report:view",
    "report:export",
    "notification:send",
    "settings:edit",
  ],
  [Role.CENTER_MANAGER]: [
    "project:view",
    "activity:view",
    "session:execute",
    "session:view",
    "center:view",
    "report:view",
  ],
  [Role.VIEWER]: [
    "project:view",
    "activity:view",
    "session:view",
    "center:view",
    "report:view",
  ],
} as const;

/**
 * Check if a role has a specific permission.
 */
export function roleHasPermission(
  role: Role,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Validate that a string is a valid Role.
 */
export function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && ALL_ROLES.includes(value as Role);
}
