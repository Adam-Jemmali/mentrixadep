"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getStudentProgressSnapshot,
  generateShareableProgressUrl,
  type ProgressSnapshot,
} from "@/app/actions/student-progress";
import { cn } from "@/lib/utils";

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-slate-600">{subtext}</p>}
    </div>
  );
}

function AccuracyChart({ data }: { data: ProgressSnapshot["questAccuracyWeekly"] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Complete some quests to see your accuracy trend.</p>;
  }

  const maxAccuracy = 100;

  return (
    <div className="flex items-end gap-2" style={{ height: 120 }}>
      {data.map((week) => (
        <div key={week.week} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={cn(
              "w-full rounded-t",
              week.accuracy >= 70 ? "bg-green-500" : week.accuracy >= 40 ? "bg-amber-500" : "bg-red-400"
            )}
            style={{ height: `${Math.max(4, (week.accuracy / maxAccuracy) * 100)}%` }}
            title={`${week.accuracy}% (${week.count} quests)`}
          />
          <span className="text-[10px] text-slate-400">{week.week.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function ProgressDashboardClient() {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    getStudentProgressSnapshot()
      .then(setSnapshot)
      .finally(() => setLoading(false));
  }, []);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const url = await generateShareableProgressUrl();
      if (url) {
        const fullUrl = `${window.location.origin}${url}`;
        setShareUrl(fullUrl);
        await navigator.clipboard?.writeText(fullUrl);
      }
    } finally {
      setSharing(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">Could not load your progress data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Progress</h1>
          <p className="text-sm text-slate-700">
            Member since {new Date(snapshot.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {sharing ? "Generating..." : "Share progress report"}
        </button>
      </div>

      {shareUrl && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Link copied to clipboard: <code className="text-xs">{shareUrl}</code>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Sessions" value={snapshot.completedSessions} subtext={`of ${snapshot.totalSessions} booked`} />
        <StatCard label="Total XP" value={snapshot.totalXp.toLocaleString()} />
        <StatCard label="Streak" value={`${snapshot.streakDays} days`} />
        <StatCard
          label="Divisions"
          value={snapshot.divisionRanks.length}
          subtext="active subjects"
        />
      </div>

      {/* Quest accuracy trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Quest Accuracy Trend</h2>
        <AccuracyChart data={snapshot.questAccuracyWeekly} />
      </div>

      {/* Division breakdown */}
      {snapshot.divisionRanks.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Division Rankings</h2>
          <div className="space-y-3">
            {snapshot.divisionRanks.map((d) => (
              <div key={d.division} className="flex items-center justify-between">
                <span className="font-medium capitalize text-slate-700">{d.division.replace(/-/g, " ")}</span>
                <span className="tabular-nums text-sm text-slate-500">{d.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {snapshot.recentAchievements.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Achievements</h2>
          <div className="flex flex-wrap gap-2">
            {snapshot.recentAchievements.map((a) => (
              <span
                key={a}
                className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
