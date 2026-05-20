"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useProject } from "@/lib/project-context";
import {
  Activity,
  Plus,
  Search,
  Calendar,
  Building2,
  Trash2,
  Edit2,
  CheckCircle,
  HelpCircle,
  Loader2,
  Eye,
  EyeOff,
  User,
  Info,
  MapPin,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DBUser {
  id: string;
  email: string;
  role: string;
}

interface Center {
  id: string;
  name: string;
  city: string;
  manager?: DBUser | null;
}

interface ProjectCenter {
  id: string;
  centerId: string;
  center: Center;
}

interface ActivityCenterRelation {
  id: string;
  centerId: string;
  center: Center;
}

interface ActivityItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  plannedSessionCount: number;
  isVolunteer: boolean;
  startDate: string | null;
  endDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  activityCenters: ActivityCenterRelation[];
}

export default function ActivitiesPage() {
  const { user } = useUser();
  const { activeProject } = useProject();

  // Access check
  const role = (user?.publicMetadata?.role as string) || "VIEWER";
  const isProjectManager = role === "PROJECT_MANAGER";
  const isProjectArchived = activeProject?.status === "ARCHIVED";
  const canModify = isProjectManager && !isProjectArchived;

  // States
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [projectCenters, setProjectCenters] = React.useState<ProjectCenter[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingCenters, setLoadingCenters] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "core" | "volunteer">("all");
  const [showArchived, setShowArchived] = React.useState(false);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityItem | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [formSessionCount, setFormSessionCount] = React.useState(1);
  const [formIsVolunteer, setFormIsVolunteer] = React.useState(false);
  const [formStartDate, setFormStartDate] = React.useState("");
  const [formEndDate, setFormEndDate] = React.useState("");
  const [selectedCenterIds, setSelectedCenterIds] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  // Fetch project activities
  const fetchActivities = React.useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/activities`);
      if (!res.ok) throw new Error("Failed to load project activities");
      const data = await res.json();
      setActivities(data);
    } catch (err: any) {
      toast.error(err.message || "Error loading activities");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  // Fetch project centers
  const fetchProjectCenters = React.useCallback(async () => {
    if (!activeProject) return;
    setLoadingCenters(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/centers`);
      if (!res.ok) throw new Error("Failed to load project centers");
      const data = await res.json();
      setProjectCenters(data);
    } catch (err: any) {
      console.error("Error loading project centers:", err);
    } finally {
      setLoadingCenters(false);
    }
  }, [activeProject]);

  // Initial load
  React.useEffect(() => {
    if (activeProject) {
      fetchActivities();
      fetchProjectCenters();
    }
  }, [activeProject, fetchActivities, fetchProjectCenters]);

  // Handle open create modal
  function handleOpenCreate() {
    setFormTitle("");
    setFormDesc("");
    setFormSessionCount(1);
    setFormIsVolunteer(false);
    setFormStartDate("");
    setFormEndDate("");
    // Select all project centers by default
    setSelectedCenterIds(projectCenters.map((pc) => pc.centerId));
    setIsCreateOpen(true);
  }

  // Handle open edit modal
  function handleOpenEdit(activity: ActivityItem) {
    setSelectedActivity(activity);
    setFormTitle(activity.title);
    setFormDesc(activity.description || "");
    setFormSessionCount(activity.plannedSessionCount);
    setFormIsVolunteer(activity.isVolunteer);
    setFormStartDate(activity.startDate ? activity.startDate.split("T")[0] : "");
    setFormEndDate(activity.endDate ? activity.endDate.split("T")[0] : "");
    setSelectedCenterIds(activity.activityCenters.map((ac) => ac.centerId));
    setIsEditOpen(true);
  }

  // Handle Create Activity submit
  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProject || !canModify) return;

    if (!formTitle.trim()) {
      toast.error("Activity title is required");
      return;
    }

    if (formSessionCount <= 0) {
      toast.error("Planned session count must be greater than 0");
      return;
    }

    if (selectedCenterIds.length === 0) {
      toast.error("At least one participating center must be selected");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${activeProject.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          plannedSessionCount: formSessionCount,
          isVolunteer: formIsVolunteer,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
          centerIds: selectedCenterIds,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create activity");
      }

      toast.success("Activity planned successfully");
      setIsCreateOpen(false);
      fetchActivities();
    } catch (err: any) {
      toast.error(err.message || "Error planning activity");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Edit Activity submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProject || !selectedActivity || !canModify) return;

    if (!formTitle.trim()) {
      toast.error("Activity title is required");
      return;
    }

    if (formSessionCount <= 0) {
      toast.error("Planned session count must be greater than 0");
      return;
    }

    if (selectedCenterIds.length === 0) {
      toast.error("At least one participating center must be selected");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${activeProject.id}/activities/${selectedActivity.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            description: formDesc.trim() || null,
            plannedSessionCount: formSessionCount,
            isVolunteer: formIsVolunteer,
            startDate: formStartDate || null,
            endDate: formEndDate || null,
            centerIds: selectedCenterIds,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update activity");
      }

      toast.success("Activity details updated");
      setIsEditOpen(false);
      fetchActivities();
    } catch (err: any) {
      toast.error(err.message || "Error updating activity");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Delete/Archive Activity submit
  async function handleDeleteSubmit() {
    if (!activeProject || !selectedActivity || !canModify) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${activeProject.id}/activities/${selectedActivity.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to archive activity");
      }

      toast.success("Activity successfully archived");
      setIsDeleteOpen(false);
      setSelectedActivity(null);
      fetchActivities();
    } catch (err: any) {
      toast.error(err.message || "Error archiving activity");
    } finally {
      setSubmitting(false);
    }
  }

  // Multi-select helpers
  function toggleCenterSelection(centerId: string) {
    setSelectedCenterIds((prev) =>
      prev.includes(centerId) ? prev.filter((id) => id !== centerId) : [...prev, centerId]
    );
  }

  // Filters computed
  const filteredActivities = React.useMemo(() => {
    return activities.filter((act) => {
      // Archive Filter
      if (!showArchived && act.archivedAt) return false;
      if (showArchived && !act.archivedAt) return false;

      // Type Filter
      if (typeFilter === "volunteer" && !act.isVolunteer) return false;
      if (typeFilter === "core" && act.isVolunteer) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          act.title.toLowerCase().includes(q) ||
          (act.description && act.description.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [activities, showArchived, typeFilter, searchQuery]);

  if (!activeProject) {
    return (
      <EmptyState
        icon={Activity}
        title="No project selected"
        description="Select an active planning container from the switcher in the navbar to manage its activities."
      />
    );
  }

  const hasNoCentersAssigned = projectCenters.length === 0;

  return (
    <div className="layout-section">
      <div className="layout-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Activities Planning</h1>
          <p className="text-sm text-text-muted mt-1">
            Define workshop tracks, event series, and campaign planning parameters for <strong>{activeProject.name}</strong>.
          </p>
        </div>
        {canModify && !hasNoCentersAssigned && (
          <Button onClick={handleOpenCreate} className="flex items-center gap-1.5 shrink-0 shadow-sm">
            <Plus className="size-4" />
            Plan Activity
          </Button>
        )}
      </div>

      {hasNoCentersAssigned && !loadingCenters ? (
        <div className="mt-8 p-6 border border-dashed border-amber-300 rounded-xl bg-amber-50/10 flex flex-col items-center justify-center text-center gap-3">
          <Building2 className="size-8 text-amber-500" />
          <div className="space-y-1 max-w-md">
            <h3 className="font-semibold text-text-primary text-base">No Participating Centers</h3>
            <p className="text-xs text-text-muted">
              Activities are operational sessions distributed across centers. You must assign at least one center to this project in settings before you can plan activities.
            </p>
          </div>
          <Link href="/settings" passHref>
            <Button size="sm" className="flex items-center gap-1.5 mt-2">
              <Settings className="size-4" />
              Configure Settings
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mt-8 pb-4 border-b border-border/40">
            <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 size-4 text-text-muted" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="flex h-9 w-full sm:w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="all">All Activities</option>
                <option value="core">Core Required</option>
                <option value="volunteer">Volunteer Initiatives</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived((prev) => !prev)}
              className="flex items-center gap-1.5 shrink-0 h-9"
            >
              {showArchived ? (
                <>
                  <Eye className="size-4" />
                  View Active
                </>
              ) : (
                <>
                  <EyeOff className="size-4" />
                  View Archived
                </>
              )}
            </Button>
          </div>

          {/* Activities List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-sm text-text-muted">Loading planned activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-16 bg-muted/5 border border-dashed border-border rounded-xl mt-6">
              <EmptyState
                icon={Activity}
                title={
                  searchQuery
                    ? "No search results"
                    : showArchived
                    ? "No archived activities"
                    : "No activities planned"
                }
                description={
                  searchQuery
                    ? `No activities matched the criteria "${searchQuery}".`
                    : showArchived
                    ? "Archived activities will appear here when soft-deleted."
                    : "Establish work parameters and scheduled counts to get started."
                }
              >
                {canModify && !showArchived && !searchQuery && (
                  <Button onClick={handleOpenCreate} size="sm" className="mt-3 flex items-center gap-1.5">
                    <Plus className="size-4" />
                    Plan First Activity
                  </Button>
                )}
              </EmptyState>
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold text-xs py-3.5">Activity Parameters</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5">Planned Sessions</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5">Participating Centers</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5">Scheduling Constraint</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5">Operational Scope</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5">Date Created</TableHead>
                    <TableHead className="text-right font-semibold text-xs py-3.5 pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider delay={150}>
                    {filteredActivities.map((act) => {
                      const isArchived = !!act.archivedAt;
                      return (
                        <TableRow key={act.id} className={isArchived ? "opacity-60 bg-muted/20" : ""}>
                          <TableCell className="py-4 font-medium pl-6">
                            <div className="space-y-0.5">
                              <span className="text-sm font-semibold text-text-primary block">{act.title}</span>
                              {act.description && (
                                <span className="text-xs text-text-muted font-normal block max-w-md truncate">
                                  {act.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-sm font-semibold text-text-secondary">
                            {act.plannedSessionCount} {act.plannedSessionCount === 1 ? "session" : "sessions"}
                          </TableCell>
                          <TableCell className="py-4 text-sm">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span className="inline-flex items-center gap-1 cursor-help hover:text-primary transition-colors" />
                                }
                              >
                                <Building2 className="size-3.5 text-text-muted" />
                                <span className="font-semibold">{act.activityCenters.length}</span>
                                <span className="text-text-muted text-xs">
                                  {act.activityCenters.length === 1 ? "center" : "centers"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[280px]">
                                <div className="space-y-1.5 p-1">
                                  <p className="text-xs font-semibold border-b border-border/30 pb-1">
                                    Participating Branches
                                  </p>
                                  <ul className="text-xs space-y-1">
                                    {act.activityCenters.map((ac) => (
                                      <li key={ac.id} className="flex items-center gap-1.5">
                                        <MapPin className="size-3 text-text-muted" />
                                        <span>{ac.center.name} ({ac.center.city})</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="py-4 text-sm text-text-secondary">
                            {act.startDate || act.endDate ? (
                              <div className="flex items-center gap-1 text-xs">
                                <Calendar className="size-3.5 text-text-muted" />
                                <span>
                                  {act.startDate ? new Date(act.startDate).toLocaleDateString() : "Any"}
                                  {" → "}
                                  {act.endDate ? new Date(act.endDate).toLocaleDateString() : "Any"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-text-muted italic">No constraint</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-sm">
                            {act.isVolunteer ? (
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-semibold">
                                Volunteer
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-border text-[11px] font-semibold text-text-secondary">
                                Core Required
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-xs text-text-muted">
                            {new Date(act.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="py-4 text-right pr-6">
                            <div className="flex items-center justify-end gap-1.5">
                              {canModify && !isArchived ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEdit(act)}
                                    className="size-8 text-text-muted hover:text-text-primary hover:bg-muted"
                                    title="Edit Activity"
                                  >
                                    <Edit2 className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedActivity(act);
                                      setIsDeleteOpen(true);
                                    }}
                                    className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Archive Activity"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-text-muted italic">Read-only</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* CREATE ACTIVITY DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Plan Activity</DialogTitle>
              <DialogDescription>
                Define operational parameters, date filters, and active branch participation inside{" "}
                <strong>{activeProject.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="grid gap-1.5">
                <Label htmlFor="create-title">Activity Title *</Label>
                <Input
                  id="create-title"
                  placeholder="e.g. Intermediate Web Dev Workshop"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="create-desc">Description</Label>
                <Textarea
                  id="create-desc"
                  placeholder="Summarize planning targets, materials, or agendas..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="min-h-[70px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="create-session-count">Planned Session Count *</Label>
                  <Input
                    id="create-session-count"
                    type="number"
                    min={1}
                    value={formSessionCount}
                    onChange={(e) => setFormSessionCount(parseInt(e.target.value, 10))}
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="create-volunteer"
                    type="checkbox"
                    checked={formIsVolunteer}
                    onChange={(e) => setFormIsVolunteer(e.target.checked)}
                    className="size-4.5 rounded border-input text-primary focus:ring-primary/40 focus:ring-offset-background"
                  />
                  <Label htmlFor="create-volunteer" className="text-sm font-medium cursor-pointer">
                    Volunteer Initiative
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="create-start">Start Date (Optional)</Label>
                  <Input
                    id="create-start"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="create-end">End Date (Optional)</Label>
                  <Input
                    id="create-end"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2 border-t border-border/40 pt-3">
                <Label className="text-sm font-semibold">Participating Centers *</Label>
                <p className="text-[11px] text-text-muted mt-0.5 mb-1.5">
                  Select which assigned project branches will run sessions for this activity.
                </p>
                <div className="grid gap-2 max-h-[140px] overflow-y-auto border border-border rounded-lg p-2.5 bg-muted/10">
                  {projectCenters.map((pc) => (
                    <div
                      key={pc.centerId}
                      onClick={() => toggleCenterSelection(pc.centerId)}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCenterIds.includes(pc.centerId)}
                        onChange={() => {}} // Controlled by onClick on parent div
                        className="size-4.5 rounded border-input text-primary"
                      />
                      <div className="text-xs">
                        <p className="font-semibold text-text-primary">{pc.center.name}</p>
                        <p className="text-text-muted text-[10px]">{pc.center.city}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border/40 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Planning..." : "Plan Activity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ACTIVITY DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Activity Parameters</DialogTitle>
              <DialogDescription>
                Modify operational scope, dates, and active branch assignments.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-title">Activity Title *</Label>
                <Input
                  id="edit-title"
                  placeholder="e.g. Intermediate Web Dev Workshop"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  placeholder="Summarize planning targets, materials, or agendas..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="min-h-[70px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-session-count">Planned Session Count *</Label>
                  <Input
                    id="edit-session-count"
                    type="number"
                    min={1}
                    value={formSessionCount}
                    onChange={(e) => setFormSessionCount(parseInt(e.target.value, 10))}
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="edit-volunteer"
                    type="checkbox"
                    checked={formIsVolunteer}
                    onChange={(e) => setFormIsVolunteer(e.target.checked)}
                    className="size-4.5 rounded border-input text-primary focus:ring-primary/40 focus:ring-offset-background"
                  />
                  <Label htmlFor="edit-volunteer" className="text-sm font-medium cursor-pointer">
                    Volunteer Initiative
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-start">Start Date (Optional)</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-end">End Date (Optional)</Label>
                  <Input
                    id="edit-end"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2 border-t border-border/40 pt-3">
                <Label className="text-sm font-semibold">Participating Centers *</Label>
                <p className="text-[11px] text-text-muted mt-0.5 mb-1.5">
                  Select which assigned project branches will run sessions for this activity.
                </p>
                <div className="grid gap-2 max-h-[140px] overflow-y-auto border border-border rounded-lg p-2.5 bg-muted/10">
                  {projectCenters.map((pc) => (
                    <div
                      key={pc.centerId}
                      onClick={() => toggleCenterSelection(pc.centerId)}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCenterIds.includes(pc.centerId)}
                        onChange={() => {}} // Controlled by parent div click
                        className="size-4.5 rounded border-input text-primary"
                      />
                      <div className="text-xs">
                        <p className="font-semibold text-text-primary">{pc.center.name}</p>
                        <p className="text-text-muted text-[10px]">{pc.center.city}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border/40 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE / ARCHIVE ALERT DIALOG */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{selectedActivity?.title}</strong>?
              <br />
              <br />
              Archiving an activity soft-deletes it. Scheduled execution sessions related to this activity will remain in the database but the activity will be filtered out of active lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSubmit();
              }}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Archiving..." : "Archive Activity"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
