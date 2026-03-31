"use client";

import { useState } from "react";
import { rateSession } from "@/app/actions/student";
import { useAdminViewContext } from "@/components/admin-view-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      {!canRate && (
        <p className="text-sm font-medium text-slate-900 bg-amber-100 border border-amber-300 rounded-md px-3 py-2.5">
          This row can’t be rated (for example, the session was cancelled or tutor information is
          missing).
        </p>
      )}

      <div>
        <p className="text-sm font-semibold text-slate-900 mb-2">Your rating</p>
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
              className="p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mentrixa-500 focus-visible:ring-offset-2"
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
          className="text-sm font-semibold text-slate-900 block mb-2"
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
          className="text-sm resize-none bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:border-mentrixa-500 focus-visible:ring-mentrixa-500/30"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="button"
        className="w-full h-11 text-sm font-semibold bg-mentrixa-600 text-white hover:bg-mentrixa-700"
        disabled={loading || !canRate}
        onClick={() => void handleSubmit()}
      >
        {loading ? "Submitting…" : "Submit rating"}
      </Button>
    </div>
  );
}
