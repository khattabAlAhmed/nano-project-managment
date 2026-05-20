import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * GET /api/projects/[projectId]/centers
 * Returns all centers assigned to the project.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch assignments
    const assignments = await prisma.projectCenter.findMany({
      where: { projectId },
      include: {
        center: {
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(assignments);
  } catch (error: any) {
    console.error("GET /api/projects/[projectId]/centers error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/centers
 * Assigns a center to the project.
 * Only PROJECT_MANAGER can mutate assignments.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (dbUser.role !== Role.PROJECT_MANAGER) {
      return NextResponse.json(
        { error: "Forbidden: Only project managers can assign centers" },
        { status: 403 }
      );
    }

    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Validate project is not archived
    if (project.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Validation failed: Archived projects are read-only" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { centerId } = body;
    if (!centerId) {
      return NextResponse.json(
        { error: "Validation failed: centerId is required" },
        { status: 400 }
      );
    }

    // Fetch center
    const center = await prisma.center.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      return NextResponse.json({ error: "Center not found" }, { status: 404 });
    }

    // Validate center is not archived
    if (center.archivedAt) {
      return NextResponse.json(
        { error: "Validation failed: Archived centers cannot be assigned" },
        { status: 400 }
      );
    }

    // Check for duplicate assignment
    const existingAssignment = await prisma.projectCenter.findUnique({
      where: {
        projectId_centerId: {
          projectId,
          centerId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Validation failed: Center is already assigned to this project" },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = await prisma.projectCenter.create({
      data: {
        projectId,
        centerId,
      },
      include: {
        center: {
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
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects/[projectId]/centers error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
