"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Plus,
  FolderOpen,
  Archive,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  SlidersHorizontal,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Info
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useProject } from "@/lib/project-context";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Interface definitions matching backend
interface DashboardOverview {
  status: string;
  startDate: string;
  endDate: string;
  participatingCentersCount: number;
  totalActivitiesCount: number;
  totalSessionsCount: number;
  ownerEmail: string;
  description: string | null;
}

interface DashboardProgress {
  totalSessions: number;
  completedSessions: number;
  pendingSessions: number;
  delayedSessions: number;
  cancelledSessions: number;
  approvalQueueCount: number;
  completionPercentage: number;
}

interface TimelineSession {
  id: string;
  activityTitle: string;
  centerName: string;
  city: string;
  scheduledDate: string;
  status: string;
}

interface DashboardTimelineHealth {
  todaySessionsCount: number;
  upcomingSessions: TimelineSession[];
  overdueSessions: TimelineSession[];
}

interface CenterPerformanceMetric {
  centerId: string;
  centerName: string;
  city: string;
  assignedSessions: number;
  completedSessions: number;
  delayedSessions: number;
  completionPercentage: number;
}

interface VolunteerActivitySummary {
  volunteerSessionsCount: number;
  volunteerCompletedCount: number;
  volunteerCompletionPercentage: number;
}

interface RecentOperationalActivity {
  id: string;
  type: "APPROVAL" | "COMPLETION" | "ADJUSTMENT";
  title: string;
  description: string;
  timestamp: string;
}

interface DashboardAggregateData {
  projectOverview: DashboardOverview;
  progressOverview: DashboardProgress;
  timelineHealth: DashboardTimelineHealth;
  centerPerformance: CenterPerformanceMetric[];
  volunteerSummary: VolunteerActivitySummary;
  recentActivity: RecentOperationalActivity[];
}

export default function DashboardPage() {
  const { user } = useUser();
  const {
    activeProject,
    projects,
    isLoading: isProjectLoading,
    createProject,
  } = useProject();

  // Create Project Modal States
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Dashboard Aggregates States
  const [dashboardData, setDashboardData] = React.useState<DashboardAggregateData | null>(null);
  const [dashboardLoading, setDashboardLoading] = React.useState(false);

  // Role permissions
  const role = (user?.publicMetadata?.role as string) || "VIEWER";
  const isProjectManager = role === "PROJECT_MANAGER";

  const hasProjects = projects.length > 0;
  const activeProjectsCount = projects.filter((p) => p.status !== "ARCHIVED").length;
  const archivedOnly = hasProjects && activeProjectsCount === 0;

  // Fetch compiled metrics
  const fetchDashboardData = React.useCallback(async () => {
    if (!activeProject) return;
    setDashboardLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/dashboard`);
      if (!res.ok) throw new Error("Failed to compile dashboard metrics");
      const data = await res.json();
      setDashboardData(data);
    } catch (err: any) {
      toast.error(err.message || "Error loading dashboard metrics");
    } finally {
      setDashboardLoading(false);
    }
  }, [activeProject]);

  // Load dashboard data on mount/project switch
  React.useEffect(() => {
    if (activeProject) {
      fetchDashboardData();
    } else {
      setDashboardData(null);
    }
  }, [activeProject, fetchDashboardData]);

  function openCreate() {
    setName("");
    setDescription("");
    const today = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(today.getMonth() + 3);
    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(threeMonths.toISOString().split("T")[0]);
    setIsCreateOpen(true);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  }

  // 1. Loading indicators
  if (isProjectLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-text-muted">Loading projects...</p>
      </div>
    );
  }

  // 2. Completely empty state (no projects at all in system)
  if (!hasProjects) {
    return (
      <div className="layout-section max-w-lg mx-auto py-12">
        <EmptyState
          icon={FolderOpen}
          title="No projects found"
          description={
            isProjectManager
              ? "Get started by creating your first top-level planning and operational container."
              : "No projects have been set up in the database. Ask your project manager to create one."
          }
        >
          {isProjectManager && (
            <Button onClick={openCreate} className="mt-2 gap-1.5 shadow-sm">
              <Plus className="size-4" />
              Create First Project
            </Button>
          )}
        </EmptyState>

        {/* inline create dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  <FolderOpen className="size-5 text-primary" />
                  Create New Project
                </DialogTitle>
                <DialogDescription>
                  Establish a new top-level operational planning container for scheduling activities and physical centers.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="db-name" className="text-sm font-medium">Project Name</Label>
                  <Input
                    id="db-name"
                    placeholder="e.g. Youth Development Program 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="db-description" className="text-sm font-medium">Description (Optional)</Label>
                  <Textarea
                    id="db-description"
                    placeholder="Explain scope, goals, or target demographic..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="db-startDate" className="text-sm font-medium">Start Date</Label>
                    <Input
                      id="db-startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="db-endDate" className="text-sm font-medium">End Date</Label>
                    <Input
                      id="db-endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Create Project
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // 3. Archived-only projects state (no active/draft projects)
  if (archivedOnly && (!activeProject || activeProject.status === "ARCHIVED")) {
    return (
      <div className="layout-section max-w-lg mx-auto py-12">
        <EmptyState
          icon={Archive}
          title="All projects are archived"
          description="All planning containers are currently in read-only archive status. You can switch to an archived project using the project switcher in the navbar to view history, or create a new active project."
        >
          {isProjectManager && (
            <Button onClick={openCreate} className="mt-2 gap-1.5 shadow-sm">
              <Plus className="size-4" />
              Create Active Project
            </Button>
          )}
        </EmptyState>

        {/* inline create dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  <FolderOpen className="size-5 text-primary" />
                  Create New Project
                </DialogTitle>
                <DialogDescription>
                  Establish a new top-level operational planning container for scheduling activities and physical centers.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="arch-name" className="text-sm font-medium">Project Name</Label>
                  <Input
                    id="arch-name"
                    placeholder="e.g. Youth Development Program 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="arch-description" className="text-sm font-medium">Description (Optional)</Label>
                  <Textarea
                    id="arch-description"
                    placeholder="Explain scope, goals, or target demographic..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="arch-startDate" className="text-sm font-medium">Start Date</Label>
                    <Input
                      id="arch-startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="arch-endDate" className="text-sm font-medium">End Date</Label>
                    <Input
                      id="arch-endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Create Project
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // 4. Normal active project dashboard check
  if (!activeProject) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="No project selected"
        description="Select an active project from the project switcher in the navbar to view its dashboard."
      />
    );
  }

  return (
    <div className="layout-section">
      {/* Header */}
      <div className="layout-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Operational Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time planning progress and execution health for <strong>{activeProject.name}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeProject.status === "ARCHIVED" && (
            <Badge variant="secondary" className="px-2.5 py-1 font-medium bg-muted text-muted-foreground flex gap-1 items-center">
              <Archive className="size-3.5" />
              Archived (Read-Only)
            </Badge>
          )}
          {activeProject.status === "DRAFT" && (
            <Badge variant="outline" className="px-2.5 py-1 border-amber-500/20 bg-amber-500/5 text-amber-600 font-medium">
              Draft Mode
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={dashboardLoading}
            className="flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`size-3.5 ${dashboardLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {dashboardLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-sm text-text-muted">Compiling real-time dashboard data...</p>
        </div>
      ) : !dashboardData ? (
        <div className="py-20 text-center">
          <p className="text-sm text-text-muted">Error fetching metrics or project does not exist.</p>
        </div>
      ) : dashboardData.progressOverview.totalSessions === 0 ? (
        /* Empty State inside dashboard for projects with no sessions generated yet */
        <div className="mt-8 bg-card border border-dashed border-border rounded-xl p-10 max-w-lg mx-auto text-center space-y-4 shadow-xs">
          <LayoutDashboard className="size-10 text-text-muted mx-auto" />
          <h3 className="text-base font-semibold text-text-primary">No planning sessions scheduled</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            This project container currently has <strong>{dashboardData.projectOverview.totalActivitiesCount}</strong> activities but zero scheduled sessions.
          </p>
          <div className="bg-muted/30 border border-border/40 p-3.5 rounded-lg text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-muted">Start Date:</span>
              <span className="font-semibold text-text-secondary">{new Date(dashboardData.projectOverview.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">End Date:</span>
              <span className="font-semibold text-text-secondary">{new Date(dashboardData.projectOverview.endDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Participating Branches:</span>
              <span className="font-semibold text-text-secondary">{dashboardData.projectOverview.participatingCentersCount} centers</span>
            </div>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Navigate to the <strong>Activities</strong> tab to assign center participation and generate your deterministic session scheduling grid.
          </p>
        </div>
      ) : (
        /* REAL DYNAMIC DASHBOARD CONTENT */
        <div className="space-y-6 mt-6">
          
          {/* Section 1: Overview and Statistics Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Card 1: Core Progress */}
            <div className="p-5 bg-card border border-border/80 rounded-xl shadow-xs flex flex-col justify-between h-36">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Core Program Progress</span>
                <TrendingUp className="size-4.5 text-emerald-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-text-primary">
                  {dashboardData.progressOverview.completionPercentage}%
                </span>
                <span className="text-xs text-text-muted ml-2">
                  ({dashboardData.progressOverview.completedSessions} finished)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-3">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${dashboardData.progressOverview.completionPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Card 2: Execution Health & Overdue */}
            <div className="p-5 bg-card border border-border/80 rounded-xl shadow-xs flex flex-col justify-between h-36">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Delays & Overdue</span>
                <AlertTriangle className={`size-4.5 ${dashboardData.progressOverview.delayedSessions > 0 ? "text-rose-500 animate-pulse" : "text-text-muted"}`} />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-text-primary">
                  {dashboardData.progressOverview.delayedSessions}
                </span>
                <span className="text-xs text-text-muted ml-2">sessions delayed</span>
              </div>
              <div className="mt-3">
                {dashboardData.progressOverview.delayedSessions > 0 ? (
                  <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] py-0.5">
                    Needs Schedule Adjustments
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-300 text-emerald-600 bg-emerald-50/50 text-[10px] py-0.5 flex items-center gap-1 w-fit">
                    <CheckCircle2 className="size-2.5" /> Healthy
                  </Badge>
                )}
              </div>
            </div>

            {/* Card 3: Action Required / Approvals */}
            <div className="p-5 bg-card border border-border/80 rounded-xl shadow-xs flex flex-col justify-between h-36">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Reviews Queue</span>
                <Clock className="size-4.5 text-amber-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-text-primary">
                  {dashboardData.progressOverview.approvalQueueCount}
                </span>
                <span className="text-xs text-text-muted ml-2">pending approval</span>
              </div>
              <div className="mt-3">
                {dashboardData.progressOverview.approvalQueueCount > 0 ? (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] py-0.5">
                    Awaiting Manager Review
                  </Badge>
                ) : (
                  <span className="text-[11px] text-text-muted italic">All documentation approved</span>
                )}
              </div>
            </div>

            {/* Card 4: Project Scope */}
            <div className="p-5 bg-card border border-border/80 rounded-xl shadow-xs flex flex-col justify-between h-36">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Assigned Scope</span>
                <Building2 className="size-4.5 text-text-muted" />
              </div>
              <div className="mt-1 space-y-1">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Branches:</span>
                  <span className="font-semibold text-text-primary">{dashboardData.projectOverview.participatingCentersCount} centers</span>
                </div>
                <div className="flex justify-between text-xs text-text-muted border-t border-border/40 pt-1">
                  <span>Activities:</span>
                  <span className="font-semibold text-text-primary">{dashboardData.projectOverview.totalActivitiesCount} series</span>
                </div>
                <div className="flex justify-between text-xs text-text-muted border-t border-border/40 pt-1">
                  <span>Schedules:</span>
                  <span className="font-semibold text-text-primary">{dashboardData.projectOverview.totalSessionsCount} sessions</span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: Timeline Health and Recent activity */}
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Timeline Health Column (Upcoming & Overdue) */}
            <div className="md:col-span-2 space-y-4">
              <div className="p-5 bg-card border border-border/80 rounded-xl shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <Activity className="size-4 text-primary" />
                    Timeline Health & Scheduling
                  </h3>
                  {dashboardData.timelineHealth.todaySessionsCount > 0 && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                      {dashboardData.timelineHealth.todaySessionsCount} Sessions Today
                    </Badge>
                  )}
                </div>

                {/* Overdue List */}
                {dashboardData.timelineHealth.overdueSessions.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider block w-fit">
                      ⚠️ Overdue / Missed Schedules
                    </span>
                    <div className="space-y-2 bg-rose-50/5 border border-rose-200/50 rounded-lg p-3">
                      {dashboardData.timelineHealth.overdueSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between text-xs py-1 border-b border-rose-100 last:border-0 last:pb-0">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-text-primary block">{session.activityTitle}</span>
                            <span className="text-text-muted block text-[10px]">Branch: {session.centerName} ({session.city})</span>
                          </div>
                          <span className="text-rose-600 font-semibold shrink-0">
                            {new Date(session.scheduledDate).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming List */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider block w-fit">
                    📅 Next Upcoming Sessions
                  </span>
                  {dashboardData.timelineHealth.upcomingSessions.length === 0 ? (
                    <p className="text-xs text-text-muted italic py-2">No upcoming planning schedules.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {dashboardData.timelineHealth.upcomingSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0 last:pb-0">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-text-primary block">{session.activityTitle}</span>
                            <span className="text-text-muted block text-[10px]">Branch: {session.centerName} ({session.city})</span>
                          </div>
                          <span className="text-text-secondary font-medium bg-muted px-2 py-0.5 rounded shrink-0">
                            {new Date(session.scheduledDate).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Volunteer initiative progress tracker */}
              <div className="p-5 bg-card border border-border/80 rounded-xl shadow-xs space-y-3">
                <div className="flex justify-between items-center pb-1">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <Sparkles className="size-4 text-purple-500" />
                    Volunteer Activity Scope
                  </h3>
                  <Badge variant="outline" className="border-purple-200 text-purple-600 bg-purple-50/50 text-[10px]">
                    Non-Core Contribution
                  </Badge>
                </div>
                {dashboardData.volunteerSummary.volunteerSessionsCount === 0 ? (
                  <p className="text-xs text-text-muted italic py-1">No separate volunteer activities registered for this project.</p>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Volunteer Sessions Progress:</span>
                      <span className="font-semibold text-text-primary">
                        {dashboardData.volunteerSummary.volunteerCompletedCount} of {dashboardData.volunteerSummary.volunteerSessionsCount} ({dashboardData.volunteerSummary.volunteerCompletionPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${dashboardData.volunteerSummary.volunteerCompletionPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity Column */}
            <div className="p-5 bg-card border border-border/80 rounded-xl shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-text-primary pb-2 border-b border-border/40 flex items-center gap-1.5">
                <SlidersHorizontal className="size-4 text-text-muted" />
                Recent Operational Activity
              </h3>
              {dashboardData.recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Info className="size-6 text-text-muted mb-1.5" />
                  <p className="text-xs text-text-muted italic">No operational logs recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {dashboardData.recentActivity.map((act) => (
                    <div key={`${act.type}-${act.id}`} className="flex gap-3 text-xs">
                      {/* Left icon wrapper */}
                      <div className="mt-0.5 shrink-0">
                        {act.type === "APPROVAL" && (
                          <div className="p-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                            <UserCheck className="size-3.5" />
                          </div>
                        )}
                        {act.type === "COMPLETION" && (
                          <div className="p-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600">
                            <CheckCircle className="size-3.5" />
                          </div>
                        )}
                        {act.type === "ADJUSTMENT" && (
                          <div className="p-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600">
                            <SlidersHorizontal className="size-3.5" />
                          </div>
                        )}
                      </div>
                      
                      {/* Right content details */}
                      <div className="space-y-0.5 leading-normal">
                        <span className="font-semibold text-text-primary block">{act.title}</span>
                        <p className="text-[11px] text-text-muted leading-relaxed">{act.description}</p>
                        <span className="text-[10px] text-text-muted block pt-0.5">
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Section 3: Center Branches performance */}
          <div className="p-5 bg-card border border-border/80 rounded-xl shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-text-primary pb-2 border-b border-border/40 flex items-center gap-1.5">
              <Building2 className="size-4 text-primary" />
              Participating Branches Performance Matrix
            </h3>
            {dashboardData.centerPerformance.length === 0 ? (
              <p className="text-xs text-text-muted italic py-4">No participating centers assigned to this project settings.</p>
            ) : (
              <div className="overflow-hidden border border-border/60 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 font-semibold text-text-muted border-b border-border/60">
                      <th className="py-2.5 px-4 font-semibold">Center Branch</th>
                      <th className="py-2.5 px-4 font-semibold">City Location</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Assigned Sessions</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Completed</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Delayed / Overdue</th>
                      <th className="py-2.5 px-4 font-semibold text-right pr-6">Completion Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {dashboardData.centerPerformance.map((c) => (
                      <tr key={c.centerId} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-semibold text-text-primary">{c.centerName}</td>
                        <td className="py-3 px-4 text-text-secondary">{c.city}</td>
                        <td className="py-3 px-4 text-center font-medium text-text-primary">{c.assignedSessions}</td>
                        <td className="py-3 px-4 text-center text-emerald-600 font-semibold">{c.completedSessions}</td>
                        <td className="py-3 px-4 text-center text-rose-600 font-semibold">{c.delayedSessions}</td>
                        <td className="py-3 px-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-3">
                            <span className="font-semibold text-text-secondary">{c.completionPercentage}%</span>
                            <div className="w-24 bg-muted rounded-full h-2 overflow-hidden inline-block shrink-0">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${c.completionPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Metadata card */}
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Metadata Card */}
            <div className="p-5 bg-card border border-border/80 rounded-xl shadow-xs flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Project Timeline Overview</h2>
              <div className="text-xs text-text-muted flex flex-col gap-1.5">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="font-medium">Active Status</span>
                  <span className="font-semibold text-foreground uppercase">{activeProject.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="font-medium">Start Duration</span>
                  <span>{new Date(activeProject.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="font-medium">Close Duration</span>
                  <span>{new Date(activeProject.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-medium">Owner Identity</span>
                  <span className="truncate max-w-[120px]" title={dashboardData.projectOverview.ownerEmail}>
                    {dashboardData.projectOverview.ownerEmail}
                  </span>
                </div>
              </div>
            </div>

            {/* Description Card */}
            <div className="md:col-span-2 p-5 bg-card border border-border/80 rounded-xl shadow-xs flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Description & Scope</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                {activeProject.description || "No description provided for this planning container."}
              </p>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
