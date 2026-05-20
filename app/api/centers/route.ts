import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * GET /api/centers
 * Returns all centers sorted by name.
 * Visible to all authenticated users.
 */
export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const centers = await prisma.center.findMany({
      include: {
        manager: {
          select: {
            id: true,
            clerkUserId: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(centers);
  } catch (error: any) {
    console.error("GET /api/centers error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/centers
 * Creates a new center.
 * Only PROJECT_MANAGER can create centers.
 */
export async function POST(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (dbUser.role !== Role.PROJECT_MANAGER) {
      return NextResponse.json(
        { error: "Forbidden: Only project managers can create centers" },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const name = body.name?.trim() || "";
    const city = body.city?.trim() || "";
    const managerId = body.managerId || null;

    if (!name) {
      return NextResponse.json(
        { error: "Validation failed: Center name is required" },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        { error: "Validation failed: City is required" },
        { status: 400 }
      );
    }

    // Verify manager exists if provided
    if (managerId) {
      const managerUser = await prisma.user.findUnique({
        where: { id: managerId },
      });
      if (!managerUser) {
        return NextResponse.json(
          { error: "Validation failed: Assigned manager user does not exist" },
          { status: 400 }
        );
      }
    }

    const center = await prisma.center.create({
      data: {
        name,
        city,
        managerId,
      },
      include: {
        manager: {
          select: {
            id: true,
            clerkUserId: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(center, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/centers error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
