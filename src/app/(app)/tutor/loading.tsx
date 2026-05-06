"use client";

export default function TutorDashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <div className="rounded-2xl bg-slate-200/70 h-40" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-24 rounded-xl bg-white border border-slate-200" />
          <div className="h-24 rounded-xl bg-white border border-slate-200" />
          <div className="h-24 rounded-xl bg-white border border-slate-200" />
          <div className="h-24 rounded-xl bg-white border border-slate-200" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 rounded-xl border border-slate-200 bg-white min-h-[26rem]" />
          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white min-h-[11rem]" />
            <div className="rounded-xl border border-slate-200 bg-white min-h-[18rem]" />
            <div className="rounded-xl border border-slate-200 bg-white min-h-[12rem]" />
          </aside>
        </div>
      </div>
    </div>
  );
}
