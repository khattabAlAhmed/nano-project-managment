import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * GET /api/projects
 * Returns all projects visible to the current user.
 */
export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Projects visible:
    // - For PROJECT_MANAGER: All projects in the system.
    // - For other roles: All projects in the system (read-only), or projects they are associated with.
    // Let's retrieve all projects, ordered by createdAt descending.
    const projects = await prisma.project.findMany({
      include: {
        owner: {
          select: {
            id: true,
            clerkUserId: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Creates a new project.
 * Only PROJECT_MANAGER can create projects.
 */
export async function POST(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (dbUser.role !== Role.PROJECT_MANAGER) {
      return NextResponse.json({ error: "Forbidden: Only project managers can create projects" }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const name = body.name?.trim() || "Untitled Project";
    const description = body.description?.trim() || "";
    
    // Parse dates
    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    // Default end date is 1 month from start date if not provided
    const endDate = body.endDate ? new Date(body.endDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Validation: startDate < endDate
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Validation failed: Start date must be before end date" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate,
        endDate,
        status: "DRAFT",
        ownerId: dbUser.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            clerkUserId: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
