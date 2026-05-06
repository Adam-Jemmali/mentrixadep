"use client";

/** Fast skeleton while quest routes hydrate — nested under `student/loading` for quicker paint. */
export default function QuestSegmentLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div className="h-8 w-48 rounded-lg bg-slate-800/40 motion-safe:animate-pulse" />
      <div className="h-36 rounded-2xl border border-white/10 bg-slate-950/40 motion-safe:animate-pulse" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 rounded-xl bg-slate-800/35 motion-safe:animate-pulse" />
        <div className="h-24 rounded-xl bg-slate-800/35 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
