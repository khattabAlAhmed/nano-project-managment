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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Check,
  X,
  FileCheck,
  Building2,
  Calendar,
  ExternalLink,
  Loader2,
  User,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface ReviewDialogProps {
  session: {
    id: string;
    scheduledDate: string | Date;
    submittedAt?: string | Date | null;
    notes: string | null;
    documentationUrl: string | null;
    activity?: {
      title: string;
      isVolunteer?: boolean;
    };
    center?: {
      name: string;
      city: string;
      manager?: {
        email: string;
      } | null;
    };
  } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReviewDialog({
  session,
  isOpen,
  onOpenChange,
  onSuccess,
}: ReviewDialogProps) {
  const [reviewNotes, setReviewNotes] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  // Clear notes on open/change
  React.useEffect(() => {
    if (isOpen) {
      setReviewNotes("");
    }
  }, [isOpen]);

  if (!session) return null;

  const activityTitle = session.activity?.title || "Session Activity";
  const centerName = session.center?.name || "Center";
  const city = session.center?.city || "";
  const managerEmail = session.center?.manager?.email || "No manager assigned";
  const isVol = session.activity?.isVolunteer || false;

  async function handleReview(action: "APPROVE" | "REJECT") {
    if (!session) return;
    const formattedNotes = reviewNotes.trim();

    // Rejection notes validation
    if (action === "REJECT" && !formattedNotes) {
      toast.error("Validation failed: Rejection notes are required to reject this session.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/sessions/${session.id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNotes: formattedNotes || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to process review decision");
      }

      toast.success(
        action === "APPROVE"
          ? "Session approved successfully!"
          : "Session rejected. Rejection notes logged and notified."
      );
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Error submitting review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FileCheck className="size-5 text-primary shrink-0" />
            <span>Review Operational Execution</span>
          </DialogTitle>
          <DialogDescription>
            Audit documentation, verify execution quality, and submit your final approval decision.
          </DialogDescription>
        </DialogHeader>

        {/* ═══ Details Information Grid ═══ */}
        <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="font-semibold text-text-primary text-sm block">
                {activityTitle}
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant={isVol ? "secondary" : "default"}
                  className={isVol ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20"}
                >
                  {isVol ? "Volunteer" : "Core Activity"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-text-secondary pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="size-3.5 text-text-muted shrink-0" />
              <span className="truncate" title={`${centerName} (${city})`}>
                {centerName}
                {city && <span className="text-text-muted"> ({city})</span>}
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 justify-end">
              <User className="size-3.5 text-text-muted shrink-0" />
              <span className="truncate" title={managerEmail}>
                {managerEmail}
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar className="size-3.5 text-text-muted shrink-0" />
              <span>Scheduled: {new Date(session.scheduledDate).toLocaleDateString()}</span>
            </div>

            {session.submittedAt && (
              <div className="flex items-center gap-1.5 min-w-0 justify-end">
                <FileText className="size-3.5 text-text-muted shrink-0" />
                <span>Submitted: {new Date(session.submittedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Evidence documentation links ═══ */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-text-primary flex items-center justify-between">
            <span>Execution Evidence & Docs</span>
            {session.documentationUrl ? (
              <a
                href={session.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                Open Google Drive folder <ExternalLink className="size-3 shrink-0" />
              </a>
            ) : (
              <span className="text-rose-500 flex items-center gap-1">
                <AlertTriangle className="size-3" /> Missing Drive link
              </span>
            )}
          </Label>

          {session.documentationUrl ? (
            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-lg p-3 text-xs flex justify-between items-center">
              <span className="truncate text-emerald-600 font-mono select-all pr-4 max-w-[340px]">
                {session.documentationUrl}
              </span>
              <a
                href={session.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1.5 flex items-center justify-center transition-colors"
                title="Launch Google Drive Folder"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          ) : (
            <div className="border border-rose-500/20 bg-rose-500/5 rounded-lg p-3 text-xs text-rose-600">
              No active documentation URL was supplied. Sessions require folder proof to officially count.
            </div>
          )}
        </div>

        {/* ═══ Execution Notes ═══ */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-text-primary">Center Manager Execution Notes</Label>
          <div className="border border-border/80 rounded-lg p-3 text-xs bg-muted/20 text-text-secondary min-h-[50px] leading-relaxed max-h-[120px] overflow-y-auto">
            {session.notes || <span className="text-text-muted italic">No execution notes logged.</span>}
          </div>
        </div>

        {/* ═══ Review Notes Input ═══ */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="review-notes" className="text-xs font-semibold text-text-primary">
              Review Decisions & Rejection Notes
            </Label>
            <span className="text-[10px] text-text-muted">
              Notes are required when rejecting session submissions.
            </span>
          </div>
          <Textarea
            id="review-notes"
            placeholder="Type your feedback here..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            disabled={submitting}
            className="text-xs resize-none min-h-[90px]"
          />
        </div>

        {/* ═══ Actions Footer ═══ */}
        <DialogFooter className="gap-2 sm:gap-0 mt-5 pt-4 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
            disabled={submitting}
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            {/* Reject Button */}
            <Button
              type="button"
              variant="destructive"
              className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 flex items-center gap-1"
              onClick={() => handleReview("REJECT")}
              disabled={submitting || !reviewNotes.trim()}
              title={!reviewNotes.trim() ? "Rejection notes are required to reject" : "Reject execution and request revisions"}
            >
              {submitting ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <X className="size-3.5 stroke-[2.5px]" />
              )}
              Reject Execution
            </Button>

            {/* Approve Button */}
            <Button
              type="button"
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
              onClick={() => handleReview("APPROVE")}
              disabled={submitting}
              title="Officially approve execution and count session metrics"
            >
              {submitting ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Check className="size-3.5 stroke-[2.5px]" />
              )}
              Approve Session
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
