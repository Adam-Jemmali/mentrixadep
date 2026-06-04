"use client";

import { useEffect } from "react";
import { playMentrixaLoadingOnce } from "@/lib/mentrixa-sounds";

export default function StudentDashboardLoading() {
  useEffect(() => {
    playMentrixaLoadingOnce();
  }, []);

  return (
    <div className="space-y-8 animate-pulse">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="mt-3 h-9 w-full rounded-xl bg-slate-100" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 min-h-[22rem]">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="mt-4 space-y-3">
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 min-h-[14rem]" />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 min-h-[11rem]" />
        </aside>
      </div>
    </div>
  );
}
