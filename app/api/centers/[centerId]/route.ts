import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types/roles";

/**
 * PATCH /api/centers/[centerId]
 * Updates center details.
 * Only PROJECT_MANAGER can edit centers.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ centerId: string }> }
) {
  try {
    const { centerId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (dbUser.role !== Role.PROJECT_MANAGER) {
      return NextResponse.json(
        { error: "Forbidden: Only project managers can modify centers" },
        { status: 403 }
      );
    }

    const center = await prisma.center.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      return NextResponse.json({ error: "Center not found" }, { status: 404 });
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
          { error: "Validation failed: Center name cannot be empty" },
          { status: 400 }
        );
      }
      dataToUpdate.name = name;
    }

    if (body.city !== undefined) {
      const city = body.city?.trim() || "";
      if (!city) {
        return NextResponse.json(
          { error: "Validation failed: City cannot be empty" },
          { status: 400 }
        );
      }
      dataToUpdate.city = city;
    }

    if (body.managerId !== undefined) {
      const managerId = body.managerId;
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
        dataToUpdate.managerId = managerId;
      } else {
        dataToUpdate.managerId = null;
      }
    }

    // Support unarchiving/setting status explicitly
    if (body.archived !== undefined) {
      dataToUpdate.archivedAt = body.archived ? new Date() : null;
    }

    const updatedCenter = await prisma.center.update({
      where: { id: centerId },
      data: dataToUpdate,
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

    return NextResponse.json(updatedCenter);
  } catch (error: any) {
    console.error("PATCH /api/centers/[centerId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/centers/[centerId]
 * Soft-archives a center.
 * Only PROJECT_MANAGER can archive centers.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ centerId: string }> }
) {
  try {
    const { centerId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (dbUser.role !== Role.PROJECT_MANAGER) {
      return NextResponse.json(
        { error: "Forbidden: Only project managers can archive centers" },
        { status: 403 }
      );
    }

    const center = await prisma.center.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      return NextResponse.json({ error: "Center not found" }, { status: 404 });
    }

    const archivedCenter = await prisma.center.update({
      where: { id: centerId },
      data: {
        archivedAt: new Date(),
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

    return NextResponse.json(archivedCenter);
  } catch (error: any) {
    console.error("DELETE /api/centers/[centerId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
