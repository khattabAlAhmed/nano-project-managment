"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { Building2, Search, Plus, Pencil, Archive, MapPin, User, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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

export default function CentersPage() {
  const { user } = useUser();
  
  // States
  const [centers, setCenters] = React.useState<Center[]>([]);
  const [managers, setManagers] = React.useState<DBUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Dialog open states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = React.useState(false);

  // Form states
  const [selectedCenter, setSelectedCenter] = React.useState<Center | null>(null);
  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [managerId, setManagerId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Role details
  const role = (user?.publicMetadata?.role as string) || "VIEWER";
  const isProjectManager = role === "PROJECT_MANAGER";

  // Fetch centers and managers
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch centers
      const centersRes = await fetch("/api/centers");
      if (!centersRes.ok) throw new Error("Failed to fetch centers");
      const centersData = await centersRes.json();
      setCenters(centersData);

      // Fetch potential managers
      const usersRes = await fetch("/api/users");
      if (!usersRes.ok) throw new Error("Failed to fetch users");
      const usersData = await usersRes.json();
      
      // We can assign center managers or project managers
      const managerUsers = usersData.filter(
        (u: DBUser) => u.role === "CENTER_MANAGER" || u.role === "PROJECT_MANAGER"
      );
      setManagers(managerUsers);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error loading centers data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search filtering
  const filteredCenters = React.useMemo(() => {
    return centers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [centers, searchQuery]);

  // Create Center submission
  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim(),
          managerId: managerId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create center");
      }

      toast.success("Center created successfully");
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error creating center");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Edit Center submission
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCenter) return;
    if (!name.trim() || !city.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/centers/${selectedCenter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim(),
          managerId: managerId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update center");
      }

      toast.success("Center updated successfully");
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error updating center");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Archive Center submission
  async function handleArchiveSubmit() {
    if (!selectedCenter) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/centers/${selectedCenter.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to archive center");
      }

      toast.success("Center archived successfully");
      setIsArchiveOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error archiving center");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Open create dialog
  function openCreate() {
    setName("");
    setCity("");
    setManagerId("");
    setIsCreateOpen(true);
  }

  // Open edit dialog
  function openEdit(center: Center) {
    setSelectedCenter(center);
    setName(center.name);
    setCity(center.city);
    setManagerId(center.managerId || "");
    setIsEditOpen(true);
  }

  // Open archive dialog
  function openArchive(center: Center) {
    setSelectedCenter(center);
    setIsArchiveOpen(true);
  }

  return (
    <div className="layout-section">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Centers Management</h1>
          <p className="text-sm text-text-muted mt-1">
            Establish cities, operational branches, and manage manager assignments.
          </p>
        </div>
        {isProjectManager && (
          <Button onClick={openCreate} className="w-full sm:w-auto flex items-center justify-center gap-1.5">
            <Plus className="size-4" />
            Create Center
          </Button>
        )}
      </div>

      {/* Control Bar (Search & Actions) */}
      <div className="flex items-center gap-2 mt-6 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search centers by name or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-sm text-text-muted">Loading centers...</p>
          </div>
        ) : filteredCenters.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={searchQuery ? "No results found" : "No centers registered"}
            description={
              searchQuery
                ? `No centers matched your query "${searchQuery}".`
                : "Register the geographic and operational branches for your projects."
            }
          >
            {isProjectManager && !searchQuery && (
              <Button onClick={openCreate} variant="outline" className="mt-2">
                Create First Center
              </Button>
            )}
          </EmptyState>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Center Name</TableHead>
                  <TableHead className="font-semibold">City</TableHead>
                  <TableHead className="font-semibold">Assigned Manager</TableHead>
                  <TableHead className="font-semibold">Active Projects</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  {isProjectManager && <TableHead className="text-right font-semibold">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCenters.map((center) => {
                  const isArchived = !!center.archivedAt;
                  return (
                    <TableRow key={center.id} className={isArchived ? "opacity-60 bg-muted/20" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-md ${isArchived ? "bg-muted text-text-muted" : "bg-primary/10 text-primary"}`}>
                            <Building2 className="size-4" />
                          </div>
                          <span>{center.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-text-secondary">
                          <MapPin className="size-3.5 text-text-muted" />
                          {center.city}
                        </div>
                      </TableCell>
                      <TableCell>
                        {center.manager ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <User className="size-3.5 text-text-muted" />
                            <span className="font-medium text-text-primary">{center.manager.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic bg-muted/50 px-2 py-0.5 rounded-full">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-xs text-text-muted bg-muted/20">
                          0 Projects
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isArchived ? "secondary" : "default"}
                          className={`font-semibold text-xs ${
                            isArchived 
                              ? "bg-muted/80 text-text-muted border-transparent" 
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400"
                          }`}
                        >
                          {isArchived ? "Archived" : "Active"}
                        </Badge>
                      </TableCell>
                      {isProjectManager && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(center)}
                              disabled={isArchived}
                              title="Edit Center"
                              className="size-8"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openArchive(center)}
                              disabled={isArchived}
                              title="Archive Center"
                              className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Archive className="size-3.5" />
                            </Button>
                          </div>
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

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Create Center</DialogTitle>
              <DialogDescription>
                Register a new operational center. City and Name are required fields.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-left font-medium">
                  Center Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Cairo East Branch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city" className="text-left font-medium">
                  City *
                </Label>
                <Input
                  id="city"
                  placeholder="e.g., Cairo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager" className="text-left font-medium">
                  Center Manager (Optional)
                </Label>
                <select
                  id="manager"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="" className="text-text-muted dark:bg-zinc-950">
                    -- Select a Manager --
                  </option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id} className="dark:bg-zinc-950">
                      {m.email} ({m.role.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Center"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Center</DialogTitle>
              <DialogDescription>
                Modify details for the selected branch.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-left font-medium">
                  Center Name *
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-city" className="text-left font-medium">
                  City *
                </Label>
                <Input
                  id="edit-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-manager" className="text-left font-medium">
                  Center Manager (Optional)
                </Label>
                <select
                  id="edit-manager"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <option value="" className="text-text-muted dark:bg-zinc-950">
                    -- Select a Manager --
                  </option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id} className="dark:bg-zinc-950">
                      {m.email} ({m.role.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ARCHIVE CONFIRM DIALOG */}
      <AlertDialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Center</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{selectedCenter?.name}</strong>?
              <br />
              <br />
              Archived centers will remain visible historically, but cannot receive any new project assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleArchiveSubmit();
              }}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Archiving..." : "Archive Center"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
