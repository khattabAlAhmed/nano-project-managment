"use client";

import * as React from "react";
import { LayoutDashboard, Plus, FolderOpen, Archive, Loader2 } from "lucide-react";
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

export default function DashboardPage() {
  const { user } = useUser();
  const {
    activeProject,
    projects,
    isLoading,
    createProject,
  } = useProject();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Role permissions
  const role = (user?.publicMetadata?.role as string) || "VIEWER";
  const isProjectManager = role === "PROJECT_MANAGER";

  const hasProjects = projects.length > 0;
  const activeProjectsCount = projects.filter((p) => p.status !== "ARCHIVED").length;
  const archivedOnly = hasProjects && activeProjectsCount === 0;

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  // 1. Completely empty state (no projects at all in system)
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

  // 2. Archived-only projects state (no active/draft projects)
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

  // 3. Normal active project dashboard
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
      <div className="layout-page-header">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted">{activeProject.name}</p>
        </div>
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
      </div>

      <div className="grid gap-6 md:grid-cols-3 mt-4">
        {/* Basic Metadata card */}
        <div className="p-5 bg-card border border-border/80 rounded-xl shadow-xs flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Project Overview</h2>
          <div className="text-xs text-text-muted flex flex-col gap-1.5">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="font-medium">Status</span>
              <span className="font-semibold text-foreground uppercase">{activeProject.status}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="font-medium">Start Date</span>
              <span>{new Date(activeProject.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="font-medium">End Date</span>
              <span>{new Date(activeProject.endDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-medium">Owner</span>
              <span className="truncate max-w-[120px]">{activeProject.owner?.email || "Unknown"}</span>
            </div>
          </div>
        </div>

        {/* Main description card */}
        <div className="md:col-span-2 p-5 bg-card border border-border/80 rounded-xl shadow-xs flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Description</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            {activeProject.description || "No description provided for this planning container."}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <EmptyState
          icon={LayoutDashboard}
          title="Operational widgets coming soon"
          description="In future features, we will build progress cards, active delays analysis, center assignment status, and volunteer schedules."
        />
      </div>
    </div>
  );
}
