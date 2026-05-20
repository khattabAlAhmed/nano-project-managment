"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useProject, type Project } from "@/lib/project-context";
import {
  Settings,
  FolderOpen,
  Building2,
  Plus,
  Trash2,
  Calendar,
  User,
  MapPin,
  Loader2,
  CheckCircle2,
  Info,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

interface DBUser {
  id: string;
  email: string;
  role: string;
}

interface Center {
  id: string;
  name: string;
  city: string;
  managerId: string | null;
  archivedAt: string | null;
  manager?: DBUser | null;
}

interface ProjectCenterAssignment {
  id: string;
  projectId: string;
  centerId: string;
  createdAt: string;
  center: Center;
}

export default function SettingsPage() {
  const { user } = useUser();
  const { activeProject, updateProject, projects } = useProject();

  // Role permissions
  const role = (user?.publicMetadata?.role as string) || "VIEWER";
  const isProjectManager = role === "PROJECT_MANAGER";
  const isArchived = activeProject?.status === "ARCHIVED";
  const canModify = isProjectManager && !isArchived;

  // Tabs state
  const [activeTab, setActiveTab] = React.useState("project");

  // Center Assignment states
  const [assignedCenters, setAssignedCenters] = React.useState<ProjectCenterAssignment[]>([]);
  const [globalCenters, setGlobalCenters] = React.useState<Center[]>([]);
  const [loadingAssignments, setLoadingAssignments] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modals state
  const [isAssignOpen, setIsAssignOpen] = React.useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = React.useState(false);
  const [selectedCenterId, setSelectedCenterId] = React.useState("");
  const [selectedAssignment, setSelectedAssignment] = React.useState<ProjectCenterAssignment | null>(null);
  const [submittingAssign, setSubmittingAssign] = React.useState(false);
  const [submittingRemove, setSubmittingRemove] = React.useState(false);

  // Project Details Form states
  const [projectName, setProjectName] = React.useState("");
  const [projectDesc, setProjectDesc] = React.useState("");
  const [projectStart, setProjectStart] = React.useState("");
  const [projectEnd, setProjectEnd] = React.useState("");
  const [projectStatus, setProjectStatus] = React.useState<"DRAFT" | "ACTIVE" | "ARCHIVED">("DRAFT");
  const [submittingDetails, setSubmittingDetails] = React.useState(false);

  // General settings mock states
  const [prefTheme, setPrefTheme] = React.useState("system");
  const [prefLang, setPrefLang] = React.useState("en");
  const [prefNotify, setPrefNotify] = React.useState(true);

  // Fetch project-specific assignments
  const fetchAssignments = React.useCallback(async () => {
    if (!activeProject) return;
    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/centers`);
      if (!res.ok) throw new Error("Failed to load assigned centers");
      const data = await res.json();
      setAssignedCenters(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error fetching assigned centers");
    } finally {
      setLoadingAssignments(false);
    }
  }, [activeProject]);

  // Fetch global centers list
  const fetchGlobalCenters = React.useCallback(async () => {
    try {
      const res = await fetch("/api/centers");
      if (!res.ok) throw new Error("Failed to load global centers");
      const data = await res.json();
      setGlobalCenters(data);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  // Fetch data on activeProject change
  React.useEffect(() => {
    if (activeProject) {
      fetchAssignments();
      fetchGlobalCenters();

      // Initialize form fields
      setProjectName(activeProject.name);
      setProjectDesc(activeProject.description || "");
      setProjectStart(activeProject.startDate ? activeProject.startDate.split("T")[0] : "");
      setProjectEnd(activeProject.endDate ? activeProject.endDate.split("T")[0] : "");
      setProjectStatus(activeProject.status);
    }
  }, [activeProject, fetchAssignments, fetchGlobalCenters]);

  // Filter out centers already assigned or archived
  const availableCenters = React.useMemo(() => {
    const assignedIds = new Set(assignedCenters.map((ac) => ac.centerId));
    return globalCenters.filter((c) => !c.archivedAt && !assignedIds.has(c.id));
  }, [globalCenters, assignedCenters]);

  // Search filter for assigned centers
  const filteredAssignments = React.useMemo(() => {
    return assignedCenters.filter(
      (ac) =>
        ac.center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ac.center.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [assignedCenters, searchQuery]);

  // Handle Project Details submit
  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProject || !canModify) return;

    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (new Date(projectStart) >= new Date(projectEnd)) {
      toast.error("Start date must be before end date");
      return;
    }

    setSubmittingDetails(true);
    try {
      await updateProject(activeProject.id, {
        name: projectName.trim(),
        description: projectDesc.trim() || undefined,
        startDate: new Date(projectStart).toISOString(),
        endDate: new Date(projectEnd).toISOString(),
        status: projectStatus,
      });
      toast.success("Project settings updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update project settings");
    } finally {
      setSubmittingDetails(false);
    }
  }

  // Handle Assign Center submit
  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProject || !selectedCenterId || !canModify) return;

    setSubmittingAssign(true);
    try {
      const response = await fetch(`/api/projects/${activeProject.id}/centers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerId: selectedCenterId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign center");
      }

      toast.success("Center assigned to project successfully");
      setIsAssignOpen(false);
      setSelectedCenterId("");
      fetchAssignments();
    } catch (err: any) {
      toast.error(err.message || "Error assigning center");
    } finally {
      setSubmittingAssign(false);
    }
  }

  // Handle Remove Assignment submit
  async function handleRemoveSubmit() {
    if (!activeProject || !selectedAssignment || !canModify) return;

    setSubmittingRemove(true);
    try {
      const response = await fetch(
        `/api/projects/${activeProject.id}/centers/${selectedAssignment.centerId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove assignment");
      }

      toast.success("Center removed from project successfully");
      setIsRemoveOpen(false);
      setSelectedAssignment(null);
      fetchAssignments();
    } catch (err: any) {
      toast.error(err.message || "Error removing center");
    } finally {
      setSubmittingRemove(false);
    }
  }

  // Save General Prefs
  function handleGeneralSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Preferences saved successfully (Demo mode)");
  }

  // Render header
  return (
    <div className="layout-section">
      <div className="layout-page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage active project configuration, center assignments, and application preferences.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="w-full justify-start max-w-md border-b border-border/40 pb-px">
          <TabsTrigger value="project" className="flex items-center gap-1.5 px-4 py-2">
            <Sliders className="size-4" />
            Project Settings
          </TabsTrigger>
          <TabsTrigger value="app" className="flex items-center gap-1.5 px-4 py-2">
            <Settings className="size-4" />
            App Preferences
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Project settings & Assignments */}
        <TabsContent value="project" className="space-y-8 mt-6">
          {!activeProject ? (
            <EmptyState
              icon={FolderOpen}
              title="No project selected"
              description="Select an active project from the project switcher in the navbar to configure its settings."
            />
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Project Details Form */}
              <div className="lg:col-span-1 bg-card border border-border/80 rounded-xl p-6 shadow-xs flex flex-col gap-5 h-fit">
                <div>
                  <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                    <FolderOpen className="size-4.5 text-primary" />
                    Project Details
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Update metadata and scheduling status.
                  </p>
                </div>

                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="proj-name">Project Name *</Label>
                    <Input
                      id="proj-name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      disabled={!canModify}
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="proj-desc">Description</Label>
                    <Textarea
                      id="proj-desc"
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      disabled={!canModify}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="proj-start">Start Date *</Label>
                      <Input
                        id="proj-start"
                        type="date"
                        value={projectStart}
                        onChange={(e) => setProjectStart(e.target.value)}
                        disabled={!canModify}
                        required
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="proj-end">End Date *</Label>
                      <Input
                        id="proj-end"
                        type="date"
                        value={projectEnd}
                        onChange={(e) => setProjectEnd(e.target.value)}
                        disabled={!canModify}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="proj-status">Status *</Label>
                    <select
                      id="proj-status"
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value as any)}
                      disabled={!canModify}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>

                  {isArchived && (
                    <div className="flex gap-2 p-3 bg-muted/50 rounded-lg text-xs text-text-muted items-start">
                      <Info className="size-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        This project is archived and read-only. Unarchive it to enable editing.
                      </span>
                    </div>
                  )}

                  {!isProjectManager && (
                    <div className="flex gap-2 p-3 bg-muted/50 rounded-lg text-xs text-text-muted items-start">
                      <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>Only project managers can modify project metadata.</span>
                    </div>
                  )}

                  {canModify && (
                    <Button type="submit" disabled={submittingDetails} className="w-full">
                      {submittingDetails ? "Saving Changes..." : "Save Project Settings"}
                    </Button>
                  )}
                </form>
              </div>

              {/* Project Center Assignments */}
              <div className="lg:col-span-2 bg-card border border-border/80 rounded-xl p-6 shadow-xs flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
                  <div>
                    <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                      <Building2 className="size-4.5 text-primary" />
                      Participating Centers
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      Configure the operational centers assigned to this planning container.
                    </p>
                  </div>
                  {canModify && (
                    <Button
                      onClick={() => setIsAssignOpen(true)}
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <Plus className="size-4" />
                      Assign Center
                    </Button>
                  )}
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
                  <Input
                    placeholder="Search assigned centers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pr-8"
                  />
                </div>

                {/* Assignments List */}
                {loadingAssignments ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="size-6 text-primary animate-spin" />
                    <p className="text-xs text-text-muted">Loading assigned centers...</p>
                  </div>
                ) : filteredAssignments.length === 0 ? (
                  <div className="py-12 border border-dashed border-border rounded-lg bg-muted/10">
                    <EmptyState
                      icon={Building2}
                      title={searchQuery ? "No results found" : "No centers assigned"}
                      description={
                        searchQuery
                          ? `No assigned centers matched "${searchQuery}".`
                          : "This project operates through participating branches. Link one now."
                      }
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold text-xs">Center Name</TableHead>
                          <TableHead className="font-semibold text-xs">City</TableHead>
                          <TableHead className="font-semibold text-xs">Assigned Manager</TableHead>
                          <TableHead className="font-semibold text-xs">Linked Date</TableHead>
                          {canModify && <TableHead className="text-right font-semibold text-xs">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssignments.map((assignment) => {
                          const isCenterArchived = !!assignment.center.archivedAt;
                          return (
                            <TableRow key={assignment.id} className={isCenterArchived ? "opacity-60 bg-muted/20" : ""}>
                              <TableCell className="font-medium text-sm">
                                <div className="flex items-center gap-2">
                                  <Building2 className="size-4 text-text-muted" />
                                  <span>{assignment.center.name}</span>
                                  {isCenterArchived && (
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal bg-muted">
                                      Archived
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="flex items-center gap-1 text-text-secondary">
                                  <MapPin className="size-3 text-text-muted" />
                                  {assignment.center.city}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {assignment.center.manager ? (
                                  <div className="flex items-center gap-1 text-text-secondary">
                                    <User className="size-3 text-text-muted" />
                                    <span>{assignment.center.manager.email}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-muted italic">Unassigned</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-text-muted">
                                <div className="flex items-center gap-1">
                                  <Calendar className="size-3 text-text-muted" />
                                  {new Date(assignment.createdAt).toLocaleDateString()}
                                </div>
                              </TableCell>
                              {canModify && (
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedAssignment(assignment);
                                      setIsRemoveOpen(true);
                                    }}
                                    title="Remove Center Assignment"
                                    className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: App Preferences */}
        <TabsContent value="app" className="mt-6">
          <div className="max-w-2xl bg-card border border-border/80 rounded-xl p-6 shadow-xs flex flex-col gap-6">
            <div>
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <Sparkles className="size-4.5 text-primary" />
                App Preferences
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Customize language, themes, and notification profiles.
              </p>
            </div>

            <form onSubmit={handleGeneralSave} className="space-y-5">
              <div className="grid gap-1.5">
                <Label htmlFor="pref-lang">System Language</Label>
                <select
                  id="pref-lang"
                  value={prefLang}
                  onChange={(e) => setPrefLang(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950"
                >
                  <option value="en">English (LTR)</option>
                  <option value="ar">العربية (RTL)</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="pref-theme">Visual Theme</Label>
                <select
                  id="pref-theme"
                  value={prefTheme}
                  onChange={(e) => setPrefTheme(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System Default</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="pref-notify" className="text-sm font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-xs text-text-muted">
                    Receive operational alerts, delays, and approvals alerts.
                  </p>
                </div>
                <input
                  id="pref-notify"
                  type="checkbox"
                  checked={prefNotify}
                  onChange={(e) => setPrefNotify(e.target.checked)}
                  className="size-4.5 rounded border-input text-primary focus:ring-primary/40 focus:ring-offset-background"
                />
              </div>

              <Button type="submit" className="w-fit">
                Save Preferences
              </Button>
            </form>
          </div>
        </TabsContent>
      </Tabs>

      {/* ASSIGN CENTER DIALOG */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAssignSubmit}>
            <DialogHeader>
              <DialogTitle>Assign Center</DialogTitle>
              <DialogDescription>
                Assign an active operational center to participate in <strong>{activeProject?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="assign-select" className="text-sm font-medium">
                  Select Center *
                </Label>
                <select
                  id="assign-select"
                  value={selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="" className="text-text-muted">
                    -- Select an active Center --
                  </option>
                  {availableCenters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
                {availableCenters.length === 0 && (
                  <p className="text-xs text-amber-500 italic mt-1 flex gap-1 items-center">
                    <Info className="size-3 shrink-0" />
                    No additional active centers available for assignment.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignOpen(false)}
                disabled={submittingAssign}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAssign || !selectedCenterId}>
                {submittingAssign ? "Assigning..." : "Assign to Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* REMOVE ASSIGNMENT ALERT DIALOG */}
      <AlertDialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Center Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedAssignment?.center.name}</strong> from{" "}
              <strong>{activeProject?.name}</strong>?
              <br />
              <br />
              This action removes the operational center association. All scheduling and activities bound to this project inside this center will need to be reassessed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingRemove}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRemoveSubmit();
              }}
              disabled={submittingRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submittingRemove ? "Removing..." : "Remove Assignment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
