import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * DELETE /api/projects/[projectId]/centers/[centerId]
 * Removes a center assignment from the project.
 * Only PROJECT_MANAGER can delete assignments.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; centerId: string }> }
) {
  try {
    const { projectId, centerId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (dbUser.role !== Role.PROJECT_MANAGER) {
      return NextResponse.json(
        { error: "Forbidden: Only project managers can modify assignments" },
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

    // Check if assignment exists
    const assignment = await prisma.projectCenter.findUnique({
      where: {
        projectId_centerId: {
          projectId,
          centerId,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Delete assignment
    const deletedAssignment = await prisma.projectCenter.delete({
      where: {
        projectId_centerId: {
          projectId,
          centerId,
        },
      },
    });

    return NextResponse.json(deletedAssignment);
  } catch (error: any) {
    console.error("DELETE /api/projects/[projectId]/centers/[centerId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
