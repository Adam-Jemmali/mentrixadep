"use client";

import { useState } from "react";
import { rateSession } from "@/features/booking/rate-session";
import { emitXpAward } from "@/features/xp/xp-events";
import { useAdminViewContext } from "@/components/admin-view-context";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

interface RateSessionFormProps {
  sessionId: string;
  /** When false, the session is not eligible to rate (UI should hide the opener; this is a safety net). */
  canRate?: boolean;
  onSuccess?: () => void;
}

function friendlyRatingError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("incomplete session")) {
    return "We couldn’t record your rating because this session isn’t marked complete in the database yet. Refresh the page and try again.";
  }
  if (m.includes("before it ends") || m.includes("not ended")) {
    return "We couldn’t save your rating. Refresh the page and try again. If it still fails, contact support.";
  }
  if (m.includes("cancelled")) {
    return "Cancelled sessions cannot be rated.";
  }
  return message;
}

export function RateSessionForm({
  sessionId,
  canRate = true,
  onSuccess,
}: RateSessionFormProps) {
  const [rating, setRating] = useState(5);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticDone, setOptimisticDone] = useState(false);
  const { viewingAsUserId } = useAdminViewContext();

  async function handleSubmit() {
    if (!canRate) {
      setError("You cannot rate this session yet.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await rateSession(
        sessionId,
        rating,
        comment.trim() || undefined,
        viewingAsUserId ?? undefined,
      );
      if (!result.success) {
        setError(friendlyRatingError(result.error));
        return;
      }
      emitXpAward({
        amount: 50, // XP.SESSION_RATE = 50
        trigger: "session",
        message: "Thanks for your feedback!",
      });
      setOptimisticDone(true);
      await new Promise((r) => setTimeout(r, 450));
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  }

  const displayRating = hoveredStar ?? rating;
  const inactiveStar = "#475569";
  const activeStar = "#D97706";

  if (optimisticDone && !error) {
    return (
      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-sm font-medium text-slate-900">Thanks for your feedback.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-slate-200 bg-white p-4">
      {!canRate && (
        <p className="text-sm font-medium text-slate-900 bg-amber-100 border border-amber-300 rounded-md px-3 py-2.5">
          This row can’t be rated (for example, the session was cancelled or tutor information is
          missing).
        </p>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-slate-900">Your rating</p>
        <div
          className={`flex items-center gap-1 ${!canRate ? "opacity-50 pointer-events-none" : ""}`}
          onMouseLeave={() => setHoveredStar(null)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={!canRate}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
            >
              <span
                className="text-[28px] leading-none select-none"
                style={{
                  color: star <= displayRating ? activeStar : inactiveStar,
                  transition: "color 0.1s",
                }}
              >
                ★
              </span>
            </button>
          ))}
        </div>
        <p className="text-sm font-medium text-slate-800 mt-2 tabular-nums">
          {rating} / 5 stars
        </p>
      </div>

      <div>
        <label
          htmlFor={`rate-comment-${sessionId}`}
          className="mb-2 block text-sm font-medium text-slate-900"
        >
          What was most helpful?{" "}
          <span className="font-normal text-slate-700">(optional)</span>
        </label>
        <Textarea
          id={`rate-comment-${sessionId}`}
          rows={3}
          placeholder="Share a short note for your tutor…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={!canRate}
          className="resize-none border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-500 focus-visible:border-slate-400 focus-visible:ring-slate-400/30"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="button"
        className="h-10 w-full bg-slate-900 text-sm font-medium text-white hover:bg-slate-800"
        disabled={loading || !canRate}
        onClick={() => void handleSubmit()}
      >
        {loading ? "Submitting…" : "Submit rating"}
      </Button>
    </div>
  );
}
