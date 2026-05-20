import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { getProjectDashboardData } from "@/services/dashboard/project-dashboard.service";

/**
 * GET /api/projects/[projectId]/dashboard
 * Compiles aggregated dashboard data for active project monitoring.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      console.warn(`[DashboardAPI] Unauthenticated request for project ${projectId}`);
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Call the aggregated query service
    const data = await getProjectDashboardData(projectId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/projects/[projectId]/dashboard error:", error);
    
    // Graceful error reporting for non-existent projects
    if (error.message && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
