import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { getCenterDashboardData } from "@/services/center-dashboard/center-dashboard.service";

/**
 * GET /api/center/dashboard
 * Returns center-scoped operational metrics for the current authenticated user's managed centers.
 */
export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // We allow CENTER_MANAGER, PROJECT_MANAGER, and viewers to query.
    // However, if they are not a CENTER_MANAGER, they might not have managedCenters.
    // In that case, the service returns empty metrics. This is perfect and secure.
    const data = await getCenterDashboardData(dbUser.id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/center/dashboard error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
