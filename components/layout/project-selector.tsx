"use client";

import * as React from "react";
import { ChevronsUpDown, FolderOpen, Check, Plus, Edit2, Archive, Calendar, Loader2 } from "lucide-react";
import { useProject, type Project } from "@/lib/project-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ProjectSelector() {
  const { user } = useUser();
  const {
    activeProject,
    setActiveProject,
    projects,
    isLoading,
    createProject,
    updateProject,
    archiveProject,
  } = useProject();

  const [open, setOpen] = React.useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = React.useState(false);

  // Form states
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Auth/Permissions checks
  const role = (user?.publicMetadata?.role as string) || "VIEWER";
  const isProjectManager = role === "PROJECT_MANAGER";
  
  // Project owner check: matching Clerk user ID with owner's clerkUserId
  const isOwner = activeProject?.owner?.clerkUserId === user?.id;

  const activeProjects = projects.filter((p) => p.status !== "ARCHIVED");
  const archivedProjects = projects.filter((p) => p.status === "ARCHIVED");

  function handleSelect(project: Project) {
    setActiveProject(project);
    setOpen(false);
  }

  // Pre-populate create form
  function openCreate() {
    setName("");
    setDescription("");
    // Default start date is today, end date is 3 months from now
    const today = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(today.getMonth() + 3);

    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(threeMonths.toISOString().split("T")[0]);
    setIsCreateOpen(true);
    setOpen(false); // Close popover
  }

  // Pre-populate edit form
  function openEdit() {
    if (!activeProject) return;
    setName(activeProject.name);
    setDescription(activeProject.description || "");
    setStartDate(new Date(activeProject.startDate).toISOString().split("T")[0]);
    setEndDate(new Date(activeProject.endDate).toISOString().split("T")[0]);
    setIsEditOpen(true);
    setOpen(false);
  }

  function openArchive() {
    setIsArchiveOpen(true);
    setOpen(false);
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

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProject) return;
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
      await updateProject(activeProject.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmArchive() {
    if (!activeProject) return;
    setIsSubmitting(true);
    try {
      await archiveProject(activeProject.id);
      setIsArchiveOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to archive project");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label="Select project"
              className="w-[240px] justify-between gap-2 text-sm font-normal bg-card hover:bg-muted border border-border/80 shadow-xs h-9 px-3 rounded-md"
            />
          }
        >
          {isLoading ? (
            <Loader2 className="shrink-0 size-4 animate-spin text-muted-foreground" />
          ) : (
            <FolderOpen className="shrink-0 size-4 text-muted-foreground" />
          )}
          <span className="truncate flex-1 text-start font-medium">
            {activeProject?.name ?? (isLoading ? "Loading projects..." : "Select project")}
          </span>
          <ChevronsUpDown className="shrink-0 size-4 text-muted-foreground opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 shadow-md border border-border/60 bg-popover rounded-lg overflow-hidden" align="start">
          <Command className="bg-transparent">
            <CommandInput placeholder="Search projects..." className="border-none focus:ring-0 text-sm h-10" />
            <CommandList className="max-h-[220px]">
              <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                No projects found.
              </CommandEmpty>
              {activeProjects.length > 0 && (
                <CommandGroup heading="Active & Draft Projects" className="px-1.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {activeProjects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.name}
                      onSelect={() => handleSelect(project)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-foreground cursor-pointer text-sm"
                    >
                      <Check
                        className={cn(
                          "shrink-0 size-4 text-primary",
                          activeProject?.id === project.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="truncate flex-1">{project.name}</span>
                      {project.status === "DRAFT" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/20 bg-amber-500/5 text-amber-600 font-normal">
                          draft
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {archivedProjects.length > 0 && (
                <CommandGroup heading="Archived Projects" className="px-1.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {archivedProjects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.name}
                      onSelect={() => handleSelect(project)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-muted-foreground cursor-pointer text-sm"
                    >
                      <Check
                        className={cn(
                          "shrink-0 size-4 text-primary",
                          activeProject?.id === project.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="truncate flex-1">{project.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal bg-muted/70 text-muted-foreground/80">
                        archived
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>

          {/* Quick Management Section inside Popover */}
          <div className="border-t border-border/40 p-1.5 bg-muted/20 flex flex-col gap-1">
            {isProjectManager && (
              <Button
                variant="ghost"
                size="sm"
                onClick={openCreate}
                className="w-full justify-start text-xs font-medium text-primary hover:text-primary hover:bg-primary/5 h-8 gap-1.5"
              >
                <Plus className="size-3.5" />
                Create New Project
              </Button>
            )}
            {activeProject && activeProject.status !== "ARCHIVED" && (
              <div className="flex gap-1">
                {isProjectManager && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openEdit}
                    className="flex-1 justify-center text-xs font-medium h-8 gap-1.5"
                  >
                    <Edit2 className="size-3" />
                    Edit Project
                  </Button>
                )}
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openArchive}
                    className="flex-1 justify-center text-xs font-medium text-destructive hover:bg-destructive/5 hover:text-destructive h-8 gap-1.5"
                  >
                    <Archive className="size-3" />
                    Archive
                  </Button>
                )}
              </div>
            )}
            {activeProject?.status === "ARCHIVED" && (
              <div className="text-[10px] py-1 text-center font-medium text-muted-foreground/80 bg-muted/40 rounded">
                This project is archived (Read-Only)
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* CREATE PROJECT DIALOG */}
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
                <Label htmlFor="name" className="text-sm font-medium">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Youth Development Program 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Explain scope, goals, or target demographic..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
                  <div className="relative">
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
                  <div className="relative">
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
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

      {/* EDIT PROJECT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Edit2 className="size-5 text-primary" />
                Edit Project Metadata
              </DialogTitle>
              <DialogDescription>
                Update description, names, or target schedule range for this project.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">Project Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description" className="text-sm font-medium">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-startDate" className="text-sm font-medium">Start Date</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-endDate" className="text-sm font-medium">End Date</Label>
                  <Input
                    id="edit-endDate"
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
                onClick={() => setIsEditOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ARCHIVE CONFIRMATION DIALOG */}
      <AlertDialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold flex items-center gap-2 text-destructive">
              <Archive className="size-5" />
              Archive Project?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to archive <strong>{activeProject?.name}</strong>?
              <br /><br />
              Archiving makes this project <strong>read-only</strong>. Historical planning, centers, and activity progress remain fully accessible in reports, but no further mutations or scheduling additions will be permitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmArchive();
              }}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="size-4" />
                  Confirm Archive
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
