"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Play,
  Check,
  AlertTriangle,
  FileCheck,
  Building2,
  Calendar,
  Lock,
  ExternalLink,
  Loader2,
  Info
} from "lucide-react";

interface SessionExecutionDialogProps {
  session: {
    id: string;
    activityTitle?: string;
    activity?: { title: string };
    centerName?: string;
    center?: {
      id: string;
      name: string;
      city?: string;
      managerId?: string | null;
    };
    status: string;
    approvalStatus: string;
    documentationUrl: string | null;
    notes: string | null;
    isLocked?: boolean;
    scheduledDate: string;
  } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentUserId?: string; // Database User UUID
  currentUserRole?: string; // Role string (PROJECT_MANAGER, CENTER_MANAGER)
  isProjectArchived?: boolean;
}

export function SessionExecutionDialog({
  session,
  isOpen,
  onOpenChange,
  onSuccess,
  currentUserId,
  currentUserRole,
  isProjectArchived = false,
}: SessionExecutionDialogProps) {
  const [status, setStatus] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [docUrl, setDocUrl] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [actionType, setActionType] = React.useState<"SAVE" | "APPROVE">("SAVE");

  // Sync inputs on open
  React.useEffect(() => {
    if (session) {
      setStatus(session.status);
      setNotes(session.notes || "");
      setDocUrl(session.documentationUrl || "");
    }
  }, [session, isOpen]);

  if (!session) return null;

  const activityTitle = session.activityTitle || session.activity?.title || "Session Activity";
  const centerName = session.centerName || session.center?.name || "Physical Center Branch";
  
  // Security checks
  const isPM = currentUserRole === "PROJECT_MANAGER";
  const managerId = session.center?.managerId;
  
  // Only the assigned center manager or project manager can execute
  const isAssigned = isPM || (!!managerId && managerId === currentUserId);
  const isReadOnly = isProjectArchived;
  const isCompleted = session.status === "COMPLETED";

  // Reversion Guard
  const canRevert = isPM || !isCompleted;

  // Render status helper colors
  function getStatusBadge(statusStr: string) {
    switch (statusStr) {
      case "PENDING":
        return <Badge variant="outline" className="border-zinc-300 text-zinc-500 bg-zinc-400/5">Pending</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">In Progress</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>;
      case "DELAYED":
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20">Delayed</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="border-red-400 text-red-500 bg-red-400/5">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{statusStr}</Badge>;
    }
  }

  function getApprovalBadge(appStatus: string) {
    switch (appStatus) {
      case "NOT_SUBMITTED":
        return <Badge variant="outline" className="text-zinc-400">Unsubmitted</Badge>;
      case "PENDING_APPROVAL":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Awaiting Approval</Badge>;
      case "APPROVED":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20">Rejected</Badge>;
      default:
        return <Badge variant="outline">{appStatus}</Badge>;
    }
  }

  // Handle Quick Actions
  async function triggerQuickAction(targetStatus: string, triggerApproval: boolean = false) {
    if (!session) return;
    if (isReadOnly) return;
    if (!isAssigned) {
      toast.error("Forbidden: You are not authorized to modify this session.");
      return;
    }

    if (triggerApproval && (!docUrl || docUrl.trim() === "")) {
      toast.error("Validation failed: A Google Drive documentation URL is required before submitting for approval.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/sessions/${session.id}/execute`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          notes: notes.trim() || null,
          documentationUrl: docUrl.trim() || null,
          approvalStatus: triggerApproval ? "PENDING_APPROVAL" : undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update session execution");
      }

      toast.success(
        triggerApproval
          ? "Session submitted for approval successfully!"
          : `Session status updated to ${targetStatus.replace("_", " ")}!`
      );
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Error processing session action");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle standard Form Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (isReadOnly || !isAssigned) return;

    if (actionType === "APPROVE" && (!docUrl || docUrl.trim() === "")) {
      toast.error("Validation failed: A Google Drive documentation URL is required before submitting for approval.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/sessions/${session.id}/execute`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: status,
          notes: notes.trim() || null,
          documentationUrl: docUrl.trim() || null,
          approvalStatus: actionType === "APPROVE" ? "PENDING_APPROVAL" : undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save execution progress");
      }

      toast.success(
        actionType === "APPROVE"
          ? "Session execution finalized and submitted for approval!"
          : "Session execution updates saved successfully."
      );
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Error saving session updates");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span>Execute & Document Session</span>
          </DialogTitle>
          <DialogDescription>
            Update progress, add branch notes, supply documentation, or submit this session for review.
          </DialogDescription>
        </DialogHeader>

        {/* ═══ Info Banner ═══ */}
        <div className="bg-muted/30 border border-border/50 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-text-primary text-sm truncate max-w-[280px]">
              {activityTitle}
            </span>
            <div className="flex gap-1">
              {getStatusBadge(session.status)}
              {getApprovalBadge(session.approvalStatus)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-text-secondary pt-1.5 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3 text-text-muted shrink-0" />
              <span className="truncate">{centerName}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Calendar className="size-3 text-text-muted shrink-0" />
              <span>{new Date(session.scheduledDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* ═══ Authorization warning ═══ */}
        {!isAssigned && (
          <div className="flex gap-2 p-3 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-lg text-xs leading-normal text-rose-600 dark:text-rose-400">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>
              <strong>Forbidden:</strong> You are not the assigned center manager for this branch center. Access is limited to read-only views.
            </span>
          </div>
        )}

        {isReadOnly && (
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30 rounded-lg text-xs leading-normal text-amber-600 dark:text-amber-400">
            <Lock className="size-4 shrink-0 mt-0.5" />
            <span>
              <strong>Read-Only:</strong> The parent project container is archived and locked. Schedules are frozen.
            </span>
          </div>
        )}

        {/* ═══ Quick Action Prominent States ═══ */}
        {isAssigned && !isReadOnly && (
          <div className="flex gap-2.5 justify-stretch">
            {(session.status === "PENDING" || session.status === "DELAYED") && (
              <Button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-5 flex items-center gap-1.5"
                disabled={submitting}
                onClick={() => triggerQuickAction("IN_PROGRESS")}
              >
                <Play className="size-3.5 fill-current" />
                🚀 Start Session
              </Button>
            )}
            {session.status === "IN_PROGRESS" && (
              <Button
                type="button"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-5 flex items-center gap-1.5"
                disabled={submitting}
                onClick={() => triggerQuickAction("COMPLETED")}
              >
                <Check className="size-4 stroke-[3px]" />
                ✅ Mark Completed
              </Button>
            )}
            {isCompleted && session.approvalStatus === "NOT_SUBMITTED" && (
              <Button
                type="button"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-5 flex items-center gap-1.5"
                disabled={submitting || !docUrl || docUrl.trim() === ""}
                onClick={() => triggerQuickAction("COMPLETED", true)}
              >
                <FileCheck className="size-4" />
                Submit for Approval
              </Button>
            )}
          </div>
        )}

        {/* ═══ Core Form Inputs ═══ */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status select dropdown */}
          <div className="grid gap-1.5">
            <Label htmlFor="execute-status">Operational Status</Label>
            <select
              id="execute-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isReadOnly || !isAssigned || !canRevert || submitting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 dark:text-zinc-50 disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            {!canRevert && isAssigned && !isReadOnly && (
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Info className="size-3 text-text-secondary" />
                Completed sessions cannot be reverted without Project Manager authorization.
              </span>
            )}
          </div>

          {/* Documentation URL */}
          <div className="grid gap-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="execute-doc" className="flex items-center gap-1">
                <span>Google Drive Documentation URL</span>
                {actionType === "APPROVE" && <span className="text-rose-500">*</span>}
              </Label>
              {docUrl && (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                >
                  Visit <ExternalLink className="size-2.5" />
                </a>
              )}
            </div>
            <Input
              id="execute-doc"
              placeholder="e.g., https://drive.google.com/drive/folders/..."
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              disabled={isReadOnly || !isAssigned || submitting || session.approvalStatus === "APPROVED"}
              className="text-xs"
            />
            <span className="text-[10px] text-text-muted leading-snug">
              Provide physical folder or file links to evidence execution for metrics. Required for approval.
            </span>
          </div>

          {/* Execution notes */}
          <div className="grid gap-1.5">
            <Label htmlFor="execute-notes">Branch Execution Notes</Label>
            <Textarea
              id="execute-notes"
              placeholder="Write down any operational session details, participant numbers or physical outcomes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReadOnly || !isAssigned || submitting || session.approvalStatus === "APPROVED"}
              className="text-xs min-h-[90px] resize-none"
            />
          </div>

          {/* ═══ Dialog Actions Footer ═══ */}
          <DialogFooter className="gap-2 sm:gap-0 mt-6 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
              disabled={submitting}
            >
              Close
            </Button>

            {isAssigned && !isReadOnly && (
              <div className="flex flex-1 sm:flex-initial gap-2 justify-end">
                {/* Standard Save */}
                <Button
                  type="submit"
                  variant="secondary"
                  className="text-xs font-semibold px-4"
                  onClick={() => setActionType("SAVE")}
                  disabled={submitting}
                >
                  {submitting && actionType === "SAVE" && (
                    <Loader2 className="size-3 animate-spin mr-1.5" />
                  )}
                  Save Changes
                </Button>

                {/* Submit for Review */}
                {session.approvalStatus !== "PENDING_APPROVAL" &&
                  session.approvalStatus !== "APPROVED" && (
                    <Button
                      type="submit"
                      className="text-xs bg-primary text-primary-foreground font-semibold px-4"
                      onClick={() => setActionType("APPROVE")}
                      disabled={submitting || !docUrl || docUrl.trim() === ""}
                      title={!docUrl ? "Google Drive URL required to submit" : ""}
                    >
                      {submitting && actionType === "APPROVE" && (
                        <Loader2 className="size-3 animate-spin mr-1.5" />
                      )}
                      Submit for Approval
                    </Button>
                  )}
              </div>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
