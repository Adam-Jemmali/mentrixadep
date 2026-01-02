"use client";

import { useState, useEffect } from "react";
import { rateSession, canRateSession } from "@/app/actions/student";
import { useRouter } from "next/navigation";

interface RateSessionFormProps {
  sessionId: string;
}

export function RateSessionForm({ sessionId }: RateSessionFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRate, setCanRate] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkCanRate() {
      const result = await canRateSession(sessionId);
      if (!result.canRate) {
        setCanRate(false);
        setError(result.reason || "Cannot rate this session");
      }
    }
    checkCanRate();
  }, [sessionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canRate) return;
    
    setLoading(true);
    setError(null);

    try {
      await rateSession(sessionId, rating, comment || undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
      setLoading(false);
    }
  }

  if (!canRate) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded p-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {error || "Cannot rate this session"}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl ${
                star <= rating
                  ? "text-yellow-500"
                  : "text-gray-300 dark:text-gray-600"
              }`}
            >
              ★
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {rating}/5 stars
        </p>
      </div>
      <div>
        <label htmlFor={`comment-${sessionId}`} className="block text-sm font-medium mb-1">
          Comment (optional)
        </label>
        <textarea
          id={`comment-${sessionId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="Share your experience..."
        />
      </div>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
          <p className="text-red-800 dark:text-red-200 text-xs">{error}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !canRate}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium"
      >
        {loading ? "Submitting..." : "Submit Rating"}
      </button>
    </form>
  );
}

