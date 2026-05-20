"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useProject } from "@/lib/project-context";
import {
  CalendarDays,
  Search,
  Lock,
  Unlock,
  Edit2,
  Loader2,
  AlertTriangle,
  Calendar,
  Building2,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  SlidersHorizontal,
  X,
  RefreshCw,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { SessionExecutionDialog } from "@/components/sessions/session-execution-dialog";
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

interface DBUser {
  id: string;
  email: string;
  role: string;
}

interface Center {
  id: string;
  name: string;
  city: string;
  managerId?: string | null;
}

interface ActivityCenterRelation {
  id: string;
  centerId: string;
  center: Center;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isVolunteer: boolean;
  activityCenters: ActivityCenterRelation[];
}

interface SessionItem {
  id: string;
  projectId: string;
  activityId: string;
  centerId: string;
  scheduledDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED" | "CANCELLED";
  approvalStatus: "NOT_SUBMITTED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  documentationUrl: string | null;
  notes: string | null;
  isManuallyAdjusted: boolean;
  isLocked: boolean;
  manualAdjustmentReason: string | null;
  createdAt: string;
  activity: ActivityItem;
  center: Center;
}

export default function SessionsPage() {
  const { user } = useUser();
  const { activeProject } = useProject();

  // Role permissions
  const role = (user?.publicMetadata?.role as string) || "VIEWER";
  const isProjectManager = role === "PROJECT_MANAGER";
  const isProjectArchived = activeProject?.status === "ARCHIVED";
  const canModify = isProjectManager && !isProjectArchived;

  // States
  const [sessions, setSessions] = React.useState<SessionItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // DB User fetching state
  const [dbUser, setDbUser] = React.useState<DBUser | null>(null);

  // Execution Modal States
  const [isExecuteOpen, setIsExecuteOpen] = React.useState(false);
  const [selectedExecuteSession, setSelectedExecuteSession] = React.useState<SessionItem | null>(null);

  // Fetch dbUser to match center managers on physical centers
  React.useEffect(() => {
    async function fetchMe() {
      if (!user) return;
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return;
        const users = await res.json();
        const me = users.find((u: any) => u.clerkUserId === user.id);
        if (me) {
          setDbUser(me);
        }
      } catch (err) {
        console.error("Error loading db user in sessions page:", err);
      }
    }
    fetchMe();
  }, [user]);

  function handleOpenExecute(session: SessionItem) {
    setSelectedExecuteSession(session);
    setIsExecuteOpen(true);
  }
  
  // Advanced filters
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [lockFilter, setLockFilter] = React.useState<"all" | "locked" | "unlocked">("all");
  const [adjustFilter, setAdjustFilter] = React.useState<"all" | "adjusted" | "generated">("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "core" | "volunteer">("all");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [selectedSession, setSelectedSession] = React.useState<SessionItem | null>(null);
  
  // Edit Form Fields
  const [formDate, setFormDate] = React.useState("");
  const [formCenterId, setFormCenterId] = React.useState("");
  const [formIsLocked, setFormIsLocked] = React.useState(false);
  const [formReason, setFormReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Fetch project sessions
  const fetchSessions = React.useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/sessions`);
      if (!res.ok) throw new Error("Failed to load sessions");
      const data = await res.json();
      setSessions(data);
    } catch (err: any) {
      toast.error(err.message || "Error loading sessions");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  // Initial load
  React.useEffect(() => {
    if (activeProject) {
      fetchSessions();
    }
  }, [activeProject, fetchSessions]);

  // Open Edit Modal
  function handleOpenEdit(session: SessionItem) {
    setSelectedSession(session);
    setFormDate(session.scheduledDate ? session.scheduledDate.split("T")[0] : "");
    setFormCenterId(session.centerId);
    setFormIsLocked(session.isLocked);
    setFormReason(session.manualAdjustmentReason || "");
    setIsEditOpen(true);
  }

  // Handle Edit Submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSession || !canModify) return;

    if (!formDate) {
      toast.error("Scheduled date is required");
      return;
    }

    if (!formCenterId) {
      toast.error("Center assignment is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate: formDate,
          centerId: formCenterId,
          isLocked: formIsLocked,
          manualAdjustmentReason: formReason.trim() || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update session schedule");
      }

      toast.success("Session schedule adjusted successfully");
      setIsEditOpen(false);
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || "Error updating session schedule");
    } finally {
      setSubmitting(false);
    }
  }

  // Live Warning: Same activity, same center, close dates (< 2 days)
  const proximityConflict = React.useMemo(() => {
    if (!selectedSession || !formDate || !formCenterId) return null;

    const currentSelectedTime = new Date(formDate).getTime();
    const otherSessionsOfActivity = sessions.filter(
      (s) =>
        s.id !== selectedSession.id &&
        s.activityId === selectedSession.activityId &&
        s.centerId === formCenterId
    );

    for (const other of otherSessionsOfActivity) {
      const otherTime = new Date(other.scheduledDate).getTime();
      const diffDays = Math.abs(currentSelectedTime - otherTime) / (1000 * 60 * 60 * 24);
      if (diffDays < 2) {
        const otherDateStr = new Date(other.scheduledDate).toLocaleDateString();
        return {
          type: "proximity",
          message: `This activity already has a session scheduled at this center on ${otherDateStr} (within 2 days). Spacing sessions is highly recommended for optimal delivery.`,
        };
      }
    }

    return null;
  }, [selectedSession, formDate, formCenterId, sessions]);

  // Live Warning: Scheduling imbalance / High center concentration
  const balanceConflict = React.useMemo(() => {
    if (!selectedSession || !formCenterId) return null;

    // Filter sessions of this activity
    const activitySessions = sessions.filter((s) => s.activityId === selectedSession.activityId);
    const totalSessions = activitySessions.length;
    const centers = selectedSession.activity?.activityCenters || [];
    const numCenters = centers.length;

    if (totalSessions === 0 || numCenters === 0) return null;

    // Standard balanced capacity
    const balancedCapacity = Math.ceil(totalSessions / numCenters);

    // Count how many sessions this center would have
    let centerCount = 0;
    activitySessions.forEach((s) => {
      // If we are evaluating the current session, check its projected centerId
      const currentSessionProjCenter = s.id === selectedSession.id ? formCenterId : s.centerId;
      if (currentSessionProjCenter === formCenterId) {
        centerCount++;
      }
    });

    if (centerCount > balancedCapacity) {
      const targetCenterName = centers.find((c) => c.centerId === formCenterId)?.center.name || "selected center";
      return {
        type: "balance",
        message: `Reassigning will cause "${targetCenterName}" to hold ${centerCount} out of ${totalSessions} sessions, exceeding its balanced allotment of ${balancedCapacity}. This might impact center balancing rules.`,
      };
    }

    return null;
  }, [selectedSession, formCenterId, sessions]);

  // Filters computed
  const filteredSessions = React.useMemo(() => {
    let result = sessions.filter((s) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const activityMatch = s.activity?.title.toLowerCase().includes(q);
        const centerMatch = s.center?.name.toLowerCase().includes(q) || s.center?.city.toLowerCase().includes(q);
        const noteMatch = s.notes && s.notes.toLowerCase().includes(q);
        if (!activityMatch && !centerMatch && !noteMatch) return false;
      }

      // 2. Status Filter
      if (statusFilter !== "all" && s.status !== statusFilter) return false;

      // 3. Lock Filter
      if (lockFilter === "locked" && !s.isLocked) return false;
      if (lockFilter === "unlocked" && s.isLocked) return false;

      // 4. Manual Adjustment Filter
      if (adjustFilter === "adjusted" && !s.isManuallyAdjusted) return false;
      if (adjustFilter === "generated" && s.isManuallyAdjusted) return false;

      // 5. Type Filter (Core / Volunteer)
      if (typeFilter === "core" && s.activity?.isVolunteer) return false;
      if (typeFilter === "volunteer" && !s.activity?.isVolunteer) return false;

      return true;
    });

    // Sort order
    result.sort((a, b) => {
      const dateA = new Date(a.scheduledDate).getTime();
      const dateB = new Date(b.scheduledDate).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [sessions, searchQuery, statusFilter, lockFilter, adjustFilter, typeFilter, sortOrder]);

  if (!activeProject) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No project selected"
        description="Select an active planning container from the switcher in the navbar to manage its sessions."
      />
    );
  }

  // Helper colors for status badges
  function getStatusBadge(status: string) {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="border-zinc-400 text-zinc-500 font-semibold text-[11px] bg-zinc-400/5">Pending</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold text-[11px]">In Progress</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold text-[11px]">Completed</Badge>;
      case "DELAYED":
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-semibold text-[11px]">Delayed</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="border-red-400 text-red-500 font-semibold text-[11px] bg-red-400/5">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getApprovalBadge(appStatus: string) {
    switch (appStatus) {
      case "NOT_SUBMITTED":
        return <Badge variant="outline" className="border-zinc-300 text-zinc-400 text-[10px]">Unsubmitted</Badge>;
      case "PENDING_APPROVAL":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-semibold">Awaiting Approval</Badge>;
      case "APPROVED":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-semibold">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-semibold">Rejected</Badge>;
      default:
        return <Badge variant="outline">{appStatus}</Badge>;
    }
  }

  return (
    <div className="layout-section">
      {/* Header */}
      <div className="layout-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sessions Registry</h1>
          <p className="text-sm text-text-muted mt-1">
            Review calendar dates, locked schedules, and reassign branch participations for <strong>{activeProject.name}</strong>.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSessions}
          disabled={loading}
          className="flex items-center gap-1.5 shrink-0 self-start sm:self-center"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Reload
        </Button>
      </div>

      {/* Filter controls */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mt-8 pb-4 border-b border-border/40">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center max-w-3xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-text-muted" />
            <Input
              placeholder="Search by activity, center or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 w-full sm:w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="DELAYED">Delayed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Locked filter */}
          <select
            value={lockFilter}
            onChange={(e) => setLockFilter(e.target.value as any)}
            className="flex h-9 w-full sm:w-[130px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">Lock States</option>
            <option value="locked">🔒 Locked</option>
            <option value="unlocked">🔓 Unlocked</option>
          </select>

          {/* Adjustment filter */}
          <select
            value={adjustFilter}
            onChange={(e) => setAdjustFilter(e.target.value as any)}
            className="flex h-9 w-full sm:w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">All Schedules</option>
            <option value="adjusted">✍️ Manually Adjusted</option>
            <option value="generated">🤖 Auto-Generated</option>
          </select>

          {/* Type filter (Core / Volunteer) */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="flex h-9 w-full sm:w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="all">All Types</option>
            <option value="core">📋 Core Required</option>
            <option value="volunteer">💜 Volunteer</option>
          </select>
        </div>

        {/* Sorting order */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="flex items-center gap-1.5 shrink-0 h-9"
        >
          <SlidersHorizontal className="size-3.5" />
          Date: {sortOrder === "asc" ? "Oldest First" : "Newest First"}
        </Button>
      </div>

      {/* Content body */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-sm text-text-muted">Retrieving scheduled sessions...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="py-16 bg-muted/5 border border-dashed border-border rounded-xl mt-6">
          <EmptyState
            icon={CalendarDays}
            title={searchQuery || statusFilter !== "all" || lockFilter !== "all" || adjustFilter !== "all" ? "No matches found" : "No sessions scheduled"}
            description={
              searchQuery || statusFilter !== "all" || lockFilter !== "all" || adjustFilter !== "all"
                ? "Refine your filters or search query to find sessions."
                : "Plan and generate sessions under the Activities tab to see them displayed here."
            }
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-xs py-3.5 pl-6">Workshop/Activity</TableHead>
                <TableHead className="font-semibold text-xs py-3.5">Center Branch</TableHead>
                <TableHead className="font-semibold text-xs py-3.5">Scheduled Date</TableHead>
                <TableHead className="font-semibold text-xs py-3.5">Operational Status</TableHead>
                <TableHead className="font-semibold text-xs py-3.5">Approval Status</TableHead>
                <TableHead className="font-semibold text-xs py-3.5">State Indicators</TableHead>
                <TableHead className="text-right font-semibold text-xs py-3.5 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  {/* Workshop/Activity Title */}
                  <TableCell className="py-4 font-medium pl-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-text-primary">
                          {session.activity?.title || "Unknown Activity"}
                        </span>
                        {session.activity?.isVolunteer && (
                          <Badge variant="outline" className="border-purple-400/50 text-purple-600 dark:text-purple-400 bg-purple-500/5 text-[10px] py-0 px-1.5 font-semibold">
                            Volunteer
                          </Badge>
                        )}
                      </div>
                      {session.manualAdjustmentReason && (
                        <span className="text-[11px] text-amber-600 bg-amber-500/5 border border-amber-500/10 px-1.5 py-0.5 rounded font-normal inline-block max-w-xs truncate" title={`Reason: ${session.manualAdjustmentReason}`}>
                          Reason: {session.manualAdjustmentReason}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Center Branch */}
                  <TableCell className="py-4 text-sm font-semibold text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-text-muted" />
                      <span>{session.center?.name || "Unassigned"}</span>
                      {session.center?.city && (
                        <span className="text-xs text-text-muted font-normal">({session.center.city})</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Scheduled Date */}
                  <TableCell className="py-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-text-muted" />
                      <span>{new Date(session.scheduledDate).toLocaleDateString()}</span>
                    </div>
                  </TableCell>

                  {/* Operational Status */}
                  <TableCell className="py-4 text-sm">{getStatusBadge(session.status)}</TableCell>

                  {/* Approval Status */}
                  <TableCell className="py-4 text-sm">{getApprovalBadge(session.approvalStatus)}</TableCell>

                  {/* Indicators */}
                  <TableCell className="py-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      {session.isLocked ? (
                        <Badge variant="outline" className="border-zinc-300 text-zinc-600 bg-zinc-100/50 flex items-center gap-1 py-0.5 text-[10px]">
                          <Lock className="size-2.5 text-zinc-500" />
                          Locked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-dashed border-zinc-200 text-zinc-400 flex items-center gap-1 py-0.5 text-[10px]">
                          <Unlock className="size-2.5 text-zinc-300" />
                          Unlocked
                        </Badge>
                      )}

                      {session.isManuallyAdjusted && (
                        <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50/50 flex items-center gap-1 py-0.5 text-[10px]">
                          ✍️ Adjusted
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-4 text-right pr-6">
                    <div className="flex justify-end gap-1.5 items-center">
                      {/* Execute Button */}
                      {(isProjectManager || (role === "CENTER_MANAGER" && dbUser && session.center?.managerId === dbUser.id)) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenExecute(session)}
                          className="text-xs h-8 text-primary hover:text-primary-hover font-semibold px-2.5"
                        >
                          Execute
                        </Button>
                      ) : null}

                      {/* Adjust Schedule (Project Manager only) */}
                      {canModify && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(session)}
                          className="size-8 text-text-muted hover:text-text-primary hover:bg-muted"
                          title="Adjust Schedule"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                      )}

                      {/* Read-only feedback fallback */}
                      {!isProjectManager && !(role === "CENTER_MANAGER" && dbUser && session.center?.managerId === dbUser.id) && (
                        <span className="text-xs text-text-muted italic">Read-only</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* EDIT SESSION SCHEDULE DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[460px]">
          {selectedSession && (
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Adjust Session Schedule</DialogTitle>
                <DialogDescription>
                  Manually adjust execution date, reassign branch centers, and lock this session to prevent future auto-modifications.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Info summary */}
                <div className="bg-muted/30 border border-border/40 rounded-lg p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Activity Series:</span>
                    <span className="font-semibold text-text-primary">{selectedSession.activity?.title}</span>
                  </div>
                  {selectedSession.activity?.startDate && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Activity Limits:</span>
                      <span className="font-medium text-text-secondary">
                        {new Date(selectedSession.activity.startDate).toLocaleDateString()}
                        {selectedSession.activity.endDate ? ` to ${new Date(selectedSession.activity.endDate).toLocaleDateString()}` : " onward"}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-text-muted">Original Date:</span>
                    <span className="font-medium text-text-secondary">
                      {new Date(selectedSession.scheduledDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Scheduled Date */}
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-date">Scheduled Execution Date *</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>

                {/* Center Re-assignment Select Dropdown */}
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-center">Center Assignment *</Label>
                  <select
                    id="edit-center"
                    value={formCenterId}
                    onChange={(e) => setFormCenterId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 dark:text-zinc-50"
                    required
                  >
                    {selectedSession.activity?.activityCenters?.map((ac) => (
                      <option key={ac.centerId} value={ac.centerId}>
                        {ac.center.name} ({ac.center.city})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-text-muted">
                    Only centers participating in this activity are listed.
                  </p>
                </div>

                {/* Lock Session Checkbox */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    id="edit-lock"
                    type="checkbox"
                    checked={formIsLocked}
                    onChange={(e) => setFormIsLocked(e.target.checked)}
                    className="size-4.5 rounded border-input text-primary focus:ring-primary/40 focus:ring-offset-background"
                  />
                  <Label htmlFor="edit-lock" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                    🔒 Lock session schedule (preserves date during future regeneration)
                  </Label>
                </div>

                {/* Manual Adjustment Reason */}
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-reason">Reason for Manual Adjustment</Label>
                  <Textarea
                    id="edit-reason"
                    placeholder="Provide a brief explanation for auditing scheduling overrides..."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>

                {/* Conflict Warnings Notice */}
                {(proximityConflict || balanceConflict) && (
                  <div className="border border-amber-200 bg-amber-50/15 rounded-lg p-3 space-y-2 text-xs text-amber-700 dark:text-amber-500 border-dashed">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                      <span>Scheduling Constraint Warning</span>
                    </div>
                    {proximityConflict && (
                      <p className="leading-normal">{proximityConflict.message}</p>
                    )}
                    {balanceConflict && (
                      <p className="leading-normal">{balanceConflict.message}</p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="shadow-sm">
                  {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Confirm Adjustments
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* SESSION EXECUTION DIALOG */}
      {selectedExecuteSession && (
        <SessionExecutionDialog
          session={selectedExecuteSession}
          isOpen={isExecuteOpen}
          onOpenChange={setIsExecuteOpen}
          onSuccess={fetchSessions}
          currentUserId={dbUser?.id}
          currentUserRole={role}
          isProjectArchived={isProjectArchived}
        />
      )}
    </div>
  );
}
