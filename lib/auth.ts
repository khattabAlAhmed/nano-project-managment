import { auth, currentUser } from "@clerk/nextjs/server";
import { Role, isValidRole, roleHasPermission, type Permission } from "@/types/roles";

/**
 * Authenticated user shape returned by auth helpers.
 */
export interface AuthUser {
  userId: string;
  role: Role;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

/**
 * Extract role from Clerk user publicMetadata.
 * Defaults to VIEWER if no role is set.
 */
export function extractRole(publicMetadata: Record<string, unknown>): Role {
  const role = publicMetadata?.role;
  return isValidRole(role) ? role : Role.VIEWER;
}

/**
 * Get the current authenticated user with role information.
 * Returns null if not authenticated.
 *
 * Use in Server Components and Route Handlers.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const role = extractRole(
    user.publicMetadata as Record<string, unknown>
  );

  return {
    userId: user.id,
    role,
    email: user.emailAddresses[0]?.emailAddress ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  };
}

/**
 * Require authentication. Throws redirect if not authenticated.
 * Returns the authenticated user with role.
 *
 * Use in Server Components and Route Handlers.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    const { redirectToSignIn } = await auth();
    redirectToSignIn();
    // TypeScript: redirectToSignIn throws, but TS doesn't know that
    throw new Error("Not authenticated");
  }

  return user;
}

/**
 * Require a specific role. Returns the user if authorized.
 * Returns null if the user doesn't have the required role.
 *
 * Use in Server Components and Route Handlers.
 */
export async function requireRole(
  ...allowedRoles: Role[]
): Promise<AuthUser | null> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  return user;
}

/**
 * Check if the current user has a specific permission.
 * Returns the user if they have the permission, null otherwise.
 *
 * Use in Server Components and Route Handlers.
 */
export async function requirePermission(
  permission: Permission
): Promise<AuthUser | null> {
  const user = await requireAuth();

  if (!roleHasPermission(user.role, permission)) {
    return null;
  }

  return user;
}

/**
 * Get the current user's ID only (lightweight check).
 * Returns null if not authenticated.
 *
 * Use when you only need the userId without full user data.
 */
export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
