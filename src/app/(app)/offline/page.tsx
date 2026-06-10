"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";

const XP_CACHE_KEY = "mentrixa-xp-cache";

export default function OfflinePage() {
  const [xp, setXp] = useState<{ total: number; streak: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(XP_CACHE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { total?: number; streak?: number };
        setXp({ total: p.total ?? 0, streak: p.streak ?? 0 });
      }
    } catch {
      setXp(null);
    }
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">No connection</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900 tracking-tight">You&apos;re offline</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
        Your streak is safe, we keep progress on the server when you&apos;re back online. Reconnect to sync quests,
        sessions, and duels.
      </p>
      {xp && (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white px-5 py-4 text-left shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Last synced (this device)</p>
          <p className="mt-2 text-lg font-medium text-slate-900 tabular-nums">{xp.total.toLocaleString()} XP</p>
          {xp.streak > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              {xp.streak} day streak — keep it going when you&apos;re back.
            </p>
          )}
        </div>
      )}
      <Button asChild className="mt-8 min-h-[44px] px-6">
        <Link href="/student">Try again</Link>
      </Button>
    </div>
  );
}
