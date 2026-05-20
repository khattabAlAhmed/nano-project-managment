"use client";

import * as React from "react";
import { useProject } from "@/lib/project-context";
import {
  GanttChart as GanttChartIcon,
  Loader2,
  RefreshCw,
  BarChart3,
  CalendarDays,
  Building2,
  Layers,
  ZoomIn,
  ZoomOut,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  X,
  Info,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Lazy load the Gantt chart to avoid SSR issues
const GanttChart = React.lazy(() =>
  import("@/components/timeline/gantt-chart").then((mod) => ({
    default: mod.GanttChart,
  }))
);

import type { GanttTask } from "@/components/timeline/gantt-chart";

// ─── Types ───────────────────────────────────────────────

type ViewType = "activity" | "session";
type GroupBy = "activity" | "center";
type ZoomLevel = "Week" | "Month" | "Quarter Year";

interface TimelineMeta {
  type: "activity" | "session";
  activityId: string;
  activityTitle: string;
  centerId?: string;
  centerName?: string;
  centerCity?: string;
  sessionStatus?: string;
  approvalStatus?: string;
  isLocked?: boolean;
  isManuallyAdjusted?: boolean;
  isDelayed?: boolean;
  notes?: string | null;
  documentationUrl?: string | null;
  scheduledDate?: string;
  isVolunteer?: boolean;
}

interface TimelineResponse {
  tasks: (GanttTask & { meta: TimelineMeta })[];
  projectStart: string;
  projectEnd: string;
  summary: {
    totalActivities: number;
    totalSessions: number;
    completedSessions: number;
    delayedSessions: number;
    pendingSessions: number;
  };
}

// ─── Page Component ──────────────────────────────────────

export default function TimelinePage() {
  const { activeProject } = useProject();

  // View controls
  const [viewType, setViewType] = React.useState<ViewType>("activity");
  const [groupBy, setGroupBy] = React.useState<GroupBy>("activity");
  const [zoom, setZoom] = React.useState<ZoomLevel>("Month");
  const [activityType, setActivityType] = React.useState<"all" | "core" | "volunteer">("all");

  // Data
  const [timelineData, setTimelineData] = React.useState<TimelineResponse | null>(null);
  const [sessionTasks, setSessionTasks] = React.useState<(GanttTask & { meta: TimelineMeta })[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Detail preview
  const [selectedTask, setSelectedTask] = React.useState<(GanttTask & { meta: TimelineMeta }) | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // ─── Fetch timeline data ────────────────────────────────
  const fetchTimeline = React.useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const typeParam = activityType !== "all" ? `&type=${activityType}` : "";
      const res = await fetch(
        `/api/projects/${activeProject.id}/timeline?groupBy=${groupBy}${typeParam}`
      );
      if (!res.ok) throw new Error("Failed to load timeline data");
      const data: TimelineResponse = await res.json();
      setTimelineData(data);

      // For session view, also fetch individual session tasks
      if (viewType === "session") {
        const sessRes = await fetch(`/api/projects/${activeProject.id}/sessions`);
        if (sessRes.ok) {
          const sessions = await sessRes.json();
          const now = new Date();
          const mappedTasks = sessions
            .filter((s: any) => {
              if (s.status === "CANCELLED") return false;
              if (activityType === "core" && s.activity?.isVolunteer) return false;
              if (activityType === "volunteer" && !s.activity?.isVolunteer) return false;
              return true;
            })
            .map((s: any) => {
              const scheduledDate = new Date(s.scheduledDate);
              const endDate = new Date(scheduledDate);
              endDate.setDate(endDate.getDate() + 1);
              const isCompleted = s.status === "COMPLETED";
              const isDelayed =
                s.status === "DELAYED" ||
                (!isCompleted && scheduledDate < now);
              const effectiveStatus = isDelayed ? "DELAYED" : s.status;
              const isVol = s.activity?.isVolunteer || false;
              return {
                id: `session-${s.id}`,
                name: `${s.activity?.title || "Session"} — ${s.center?.name || "Unassigned"}`,
                start: formatDate(scheduledDate),
                end: formatDate(endDate),
                progress: isCompleted ? 100 : 0,
                status: effectiveStatus,
                customClass: `gantt-status-${effectiveStatus.toLowerCase()}${isVol ? " gantt-volunteer" : ""}`,
                meta: {
                  type: "session" as const,
                  activityId: s.activityId,
                  activityTitle: s.activity?.title || "Unknown",
                  centerId: s.centerId,
                  centerName: s.center?.name || "Unassigned",
                  centerCity: s.center?.city || "",
                  sessionStatus: s.status,
                  approvalStatus: s.approvalStatus,
                  isLocked: s.isLocked,
                  isManuallyAdjusted: s.isManuallyAdjusted,
                  isDelayed,
                  notes: s.notes,
                  documentationUrl: s.documentationUrl,
                  scheduledDate: formatDate(scheduledDate),
                  isVolunteer: isVol,
                },
              };
            });
          setSessionTasks(mappedTasks);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error loading timeline");
    } finally {
      setLoading(false);
    }
  }, [activeProject, groupBy, viewType, activityType]);

  React.useEffect(() => {
    if (activeProject) {
      fetchTimeline();
    }
  }, [activeProject, fetchTimeline]);

  // ─── Task click handler ─────────────────────────────────
  const handleTaskClick = React.useCallback((task: GanttTask) => {
    const taskWithMeta = task as GanttTask & { meta: TimelineMeta };
    setSelectedTask(taskWithMeta);
    setDetailOpen(true);
  }, []);

  // ─── Determine which tasks to display ───────────────────
  const displayTasks = React.useMemo(() => {
    if (viewType === "session") {
      return sessionTasks;
    }
    return timelineData?.tasks || [];
  }, [viewType, sessionTasks, timelineData]);

  // ─── No project selected ───────────────────────────────
  if (!activeProject) {
    return (
      <EmptyState
        icon={GanttChartIcon}
        title="No project selected"
        description="Select a project to view its timeline."
      />
    );
  }

  const summary = timelineData?.summary;

  return (
    <div className="layout-section">
      {/* ═══ Page Header ═══ */}
      <div className="layout-page-header flex-col sm:flex-row items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Timeline
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Operational Gantt view for{" "}
            <strong>{activeProject.name}</strong>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTimeline}
          disabled={loading}
          className="flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Reload
        </Button>
      </div>

      {/* ═══ Summary Cards ═══ */}
      {summary && summary.totalSessions > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            icon={<Layers className="size-4" />}
            label="Activities"
            value={summary.totalActivities}
            colorClass="text-brand-primary"
          />
          <SummaryCard
            icon={<CalendarDays className="size-4" />}
            label="Sessions"
            value={summary.totalSessions}
            colorClass="text-status-in-progress"
          />
          <SummaryCard
            icon={<CheckCircle className="size-4" />}
            label="Completed"
            value={summary.completedSessions}
            colorClass="text-status-completed"
          />
          <SummaryCard
            icon={<AlertTriangle className="size-4" />}
            label="Delayed"
            value={summary.delayedSessions}
            colorClass="text-status-delayed"
          />
        </div>
      )}

      {/* ═══ Toolbar ═══ */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between rounded-xl border border-border/60 bg-card/50 p-3">
        {/* Left side: View and Group controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <ToolbarButton
              active={viewType === "activity"}
              onClick={() => setViewType("activity")}
              icon={<BarChart3 className="size-3.5" />}
              label="Activity View"
            />
            <ToolbarButton
              active={viewType === "session"}
              onClick={() => setViewType("session")}
              icon={<CalendarDays className="size-3.5" />}
              label="Session View"
            />
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border hidden sm:block" />

          {/* Grouping (only in activity view) */}
          {viewType === "activity" && (
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <ToolbarButton
                active={groupBy === "activity"}
                onClick={() => setGroupBy("activity")}
                icon={<Layers className="size-3.5" />}
                label="By Activity"
              />
              <ToolbarButton
                active={groupBy === "center"}
                onClick={() => setGroupBy("center")}
                icon={<Building2 className="size-3.5" />}
                label="By Center"
              />
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-border hidden sm:block" />

          {/* Type Filter (Core / Volunteer) */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <ToolbarButton
              active={activityType === "all"}
              onClick={() => setActivityType("all")}
              icon={<Layers className="size-3.5" />}
              label="All Types"
            />
            <ToolbarButton
              active={activityType === "core"}
              onClick={() => setActivityType("core")}
              icon={<CheckCircle className="size-3.5" />}
              label="Core"
            />
            <ToolbarButton
              active={activityType === "volunteer"}
              onClick={() => setActivityType("volunteer")}
              icon={<Sparkles className="size-3.5" />}
              label="Volunteer"
            />
          </div>
        </div>

        {/* Right side: Zoom controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-medium hidden sm:inline">
            Zoom:
          </span>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <ToolbarButton
              active={zoom === "Week"}
              onClick={() => setZoom("Week")}
              icon={<ZoomIn className="size-3.5" />}
              label="Week"
            />
            <ToolbarButton
              active={zoom === "Month"}
              onClick={() => setZoom("Month")}
              icon={<Clock className="size-3.5" />}
              label="Month"
            />
            <ToolbarButton
              active={zoom === "Quarter Year"}
              onClick={() => setZoom("Quarter Year")}
              icon={<ZoomOut className="size-3.5" />}
              label="Quarter"
            />
          </div>
        </div>
      </div>

      {/* ═══ Gantt Chart Content ═══ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-sm text-text-muted">
            Loading timeline data...
          </p>
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="py-16 bg-muted/5 border border-dashed border-border rounded-xl">
          <EmptyState
            icon={GanttChartIcon}
            title="No timeline data"
            description="Generate sessions for your project activities to visualize them on the timeline."
          />
        </div>
      ) : (
        <>
          {/* Desktop/Tablet: Gantt Chart */}
          <div className="layout-timeline hidden sm:block">
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="size-6 text-primary animate-spin" />
                </div>
              }
            >
              <GanttChart
                tasks={displayTasks}
                viewMode={zoom}
                onTaskClick={handleTaskClick}
              />
            </React.Suspense>
          </div>

          {/* Mobile: Simplified list mode */}
          <div className="sm:hidden flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1 py-2">
              <Info className="size-3.5 text-text-muted" />
              <span className="text-xs text-text-muted">
                Simplified list view on mobile. Use a larger screen for the full Gantt chart.
              </span>
            </div>
            {displayTasks.map((task) => (
              <MobileTaskCard
                key={task.id}
                task={task as GanttTask & { meta: TimelineMeta }}
                onClick={() => handleTaskClick(task)}
              />
            ))}
          </div>

          {/* ═══ Legend ═══ */}
          <div className="flex flex-wrap items-center gap-3 px-1 pt-2">
            <span className="text-xs text-text-muted font-medium">Legend:</span>
            <LegendItem color="bg-status-pending" label="Pending" />
            <LegendItem color="bg-status-completed" label="Completed" />
            <LegendItem color="bg-status-delayed" label="Delayed" />
            <LegendItem color="bg-status-in-progress" label="In Progress" />
            <LegendItem color="bg-status-volunteer" label="Volunteer" />
          </div>
        </>
      )}

      {/* ═══ Detail Preview Dialog ═══ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[420px]">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg leading-snug">
                  {selectedTask.meta?.type === "session"
                    ? "Session Details"
                    : "Activity Overview"}
                </DialogTitle>
              </DialogHeader>
              <DetailPreview task={selectedTask} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub Components ──────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="layout-card-compact flex items-center gap-3">
      <div className={`${colorClass} opacity-80`}>{icon}</div>
      <div>
        <p className="text-lg font-bold text-text-primary leading-tight">
          {value}
        </p>
        <p className="text-[11px] text-text-muted font-medium">{label}</p>
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
        transition-all duration-150 cursor-pointer
        ${
          active
            ? "bg-background text-text-primary shadow-sm border border-border/50"
            : "text-text-muted hover:text-text-secondary hover:bg-background/50"
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`size-2.5 rounded-full ${color}`} />
      <span className="text-[11px] text-text-muted">{label}</span>
    </div>
  );
}

function MobileTaskCard({
  task,
  onClick,
}: {
  task: GanttTask & { meta: TimelineMeta };
  onClick: () => void;
}) {
  const meta = task.meta;
  const isDelayed = meta?.isDelayed;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left layout-card-compact flex items-center gap-3
        hover:border-border-strong transition-colors cursor-pointer
        ${isDelayed ? "border-status-delayed/30 bg-status-delayed/5" : ""}
      `}
    >
      <div
        className={`
          size-2 rounded-full shrink-0
          ${isDelayed ? "bg-status-delayed" : task.status === "COMPLETED" ? "bg-status-completed" : "bg-status-pending"}
        `}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary truncate">
          {task.name}
        </p>
        <p className="text-[11px] text-text-muted">
          {task.start} → {task.end} · {task.progress}% complete
        </p>
      </div>
      {isDelayed && (
        <AlertTriangle className="size-3.5 text-status-delayed shrink-0" />
      )}
    </button>
  );
}

function DetailPreview({
  task,
}: {
  task: GanttTask & { meta: TimelineMeta };
}) {
  const meta = task.meta;

  return (
    <div className="space-y-4 py-2">
      {/* Title */}
      <div className="space-y-1">
        <h3 className="font-semibold text-text-primary text-base">
          {meta.activityTitle}
        </h3>
        {meta.centerName && (
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Building2 className="size-3.5" />
            <span>
              {meta.centerName}
              {meta.centerCity ? ` (${meta.centerCity})` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {meta.sessionStatus && (
          <StatusBadge status={meta.sessionStatus} />
        )}
        {meta.approvalStatus && meta.approvalStatus !== "NOT_SUBMITTED" && (
          <ApprovalBadge status={meta.approvalStatus} />
        )}
        {meta.isDelayed && (
          <Badge
            variant="destructive"
            className="bg-status-delayed/15 text-status-delayed-foreground border-status-delayed/30 text-[10px] font-semibold"
          >
            <AlertTriangle className="size-2.5 mr-1" />
            Overdue
          </Badge>
        )}
      </div>

      {/* Details Grid */}
      <div className="bg-muted/30 border border-border/40 rounded-lg p-3 space-y-2 text-xs">
        {meta.scheduledDate && (
          <DetailRow
            label="Scheduled Date"
            value={new Date(meta.scheduledDate).toLocaleDateString()}
          />
        )}
        <DetailRow label="Date Range" value={`${task.start} → ${task.end}`} />
        <DetailRow label="Progress" value={`${task.progress}%`} />
        {meta.type === "session" && (
          <>
            <DetailRow
              label="Lock State"
              value={
                <span className="flex items-center gap-1">
                  {meta.isLocked ? (
                    <>
                      <Lock className="size-3 text-text-muted" /> Locked
                    </>
                  ) : (
                    <>
                      <Unlock className="size-3 text-text-muted" /> Unlocked
                    </>
                  )}
                </span>
              }
            />
            {meta.isManuallyAdjusted && (
              <DetailRow
                label="Schedule"
                value={
                  <Badge
                    variant="outline"
                    className="border-amber-300 text-amber-600 bg-amber-50/50 text-[10px]"
                  >
                    ✍️ Manually Adjusted
                  </Badge>
                }
              />
            )}
          </>
        )}
      </div>

      {/* Notes */}
      {meta.notes && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-text-secondary">Notes</p>
          <p className="text-xs text-text-muted bg-muted/20 rounded-md p-2 leading-relaxed">
            {meta.notes}
          </p>
        </div>
      )}

      {/* Documentation Link */}
      {meta.documentationUrl && (
        <a
          href={meta.documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-brand-primary hover:underline"
        >
          <ExternalLink className="size-3" />
          Open Documentation
        </a>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    PENDING: {
      className: "bg-status-pending/15 text-status-pending-foreground border-status-pending/30",
      label: "Pending",
    },
    IN_PROGRESS: {
      className: "bg-status-in-progress/15 text-status-in-progress-foreground border-status-in-progress/30",
      label: "In Progress",
    },
    COMPLETED: {
      className: "bg-status-completed/15 text-status-completed-foreground border-status-completed/30",
      label: "Completed",
    },
    DELAYED: {
      className: "bg-status-delayed/15 text-status-delayed-foreground border-status-delayed/30",
      label: "Delayed",
    },
    CANCELLED: {
      className: "bg-muted/30 text-text-muted border-border",
      label: "Cancelled",
    },
  };

  const c = config[status] || { className: "bg-muted", label: status };

  return (
    <Badge variant="outline" className={`${c.className} text-[10px] font-semibold`}>
      {c.label}
    </Badge>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    PENDING_APPROVAL: {
      className: "bg-status-warning/15 text-status-warning-foreground border-status-warning/30",
      label: "Awaiting Approval",
    },
    APPROVED: {
      className: "bg-status-approved/15 text-status-approved-foreground border-status-approved/30",
      label: "Approved",
    },
    REJECTED: {
      className: "bg-status-rejected/15 text-status-rejected-foreground border-status-rejected/30",
      label: "Rejected",
    },
  };

  const c = config[status] || { className: "bg-muted", label: status };

  return (
    <Badge variant="outline" className={`${c.className} text-[10px] font-semibold`}>
      {c.label}
    </Badge>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
