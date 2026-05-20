import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * PATCH /api/projects/[projectId]
 * Updates project metadata.
 * Archived projects are read-only and cannot be edited.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Archived projects cannot be edited
    if (project.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Archived projects are read-only and cannot be modified" },
        { status: 400 }
      );
    }

    // Edit permission check:
    // Only the project owner or a PROJECT_MANAGER can edit the project.
    const isOwner = project.ownerId === dbUser.id;
    const isManager = dbUser.role === Role.PROJECT_MANAGER;

    if (!isOwner && !isManager) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to edit this project" },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const dataToUpdate: any = {};

    if (body.name !== undefined) {
      const name = body.name?.trim() || "";
      if (!name) {
        return NextResponse.json(
          { error: "Validation failed: Project name is required" },
          { status: 400 }
        );
      }
      dataToUpdate.name = name;
    }

    if (body.description !== undefined) {
      dataToUpdate.description = body.description?.trim() || null;
    }

    // Validate and update dates
    let newStartDate = project.startDate;
    let newEndDate = project.endDate;

    if (body.startDate !== undefined) {
      newStartDate = new Date(body.startDate);
      dataToUpdate.startDate = newStartDate;
    }

    if (body.endDate !== undefined) {
      newEndDate = new Date(body.endDate);
      dataToUpdate.endDate = newEndDate;
    }

    if (body.startDate !== undefined || body.endDate !== undefined) {
      if (newStartDate >= newEndDate) {
        return NextResponse.json(
          { error: "Validation failed: Start date must be before end date" },
          { status: 400 }
        );
      }
    }

    if (body.status !== undefined) {
      // If setting to ARCHIVED, delegate to DELETE/archive workflow or handle here.
      // If setting status, ensure it is a valid ProjectStatus enum.
      const allowedStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"];
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 }
        );
      }
      
      // Only the project owner can archive a project
      if (body.status === "ARCHIVED" && !isOwner) {
        return NextResponse.json(
          { error: "Forbidden: Only the project owner can archive this project" },
          { status: 403 }
        );
      }

      dataToUpdate.status = body.status;
      if (body.status === "ARCHIVED") {
        dataToUpdate.archivedAt = new Date();
      } else {
        dataToUpdate.archivedAt = null;
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: dataToUpdate,
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

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    console.error("PATCH /api/projects/[projectId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]
 * Archives the project instead of hard-deleting it.
 * Only the project owner can archive the project.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only project owners can archive projects
    const isOwner = project.ownerId === dbUser.id;
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: Only the project owner can archive this project" },
        { status: 403 }
      );
    }

    // Archive the project
    const archivedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
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

    return NextResponse.json(archivedProject);
  } catch (error: any) {
    console.error("DELETE /api/projects/[projectId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
