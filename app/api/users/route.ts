import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * GET /api/users
 * Returns list of database users, optionally filtered by role.
 * Accessible to any authenticated user.
 */
export async function GET(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");

    const whereClause: any = {};
    if (roleParam) {
      // Validate that the roleParam is a valid role
      if (Object.values(Role).includes(roleParam as Role)) {
        whereClause.role = roleParam as Role;
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        role: true,
      },
      orderBy: {
        email: "asc",
      },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
