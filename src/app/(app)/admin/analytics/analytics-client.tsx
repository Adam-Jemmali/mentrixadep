"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type {
  EventCountRow,
  DailyCountRow,
  FunnelStepRow,
  SubjectRow,
  RevenueRow,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function fmtDate(d: string): string {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtEventName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Prop Types ──────────────────────────────────────────────────────────────

interface Props {
  days: 7 | 30;
  kpis: { totalUsers: number; totalSessions: number; totalRevenue: number; activeToday: number };
  eventCounts: EventCountRow[];
  funnel: FunnelStepRow[];
  subjects: SubjectRow[];
  revenue: RevenueRow[];
  dailySignups: DailyCountRow[];
  dailyQuests: DailyCountRow[];
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-[12px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
      {sub && <p className="text-[12px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Day Range Toggle ────────────────────────────────────────────────────────

function DayToggle({ days }: { days: 7 | 30 }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = (d: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("days", String(d));
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
      {([7, 30] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => set(d)}
          className={cn(
            "px-3 py-1 text-[12px] font-medium rounded transition-colors duration-150",
            days === d
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

// ─── Funnel Bar ──────────────────────────────────────────────────────────────

function FunnelBar({ step, users, pct }: FunnelStepRow) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-slate-700">{step}</span>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-slate-900 tabular-nums">{fmtNum(users)}</span>
          <span className="text-[11px] text-slate-400 tabular-nums w-8 text-right">{pct}%</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-800 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Event Table ─────────────────────────────────────────────────────────────

const EVENT_CATEGORY: Record<string, string> = {
  page_view_landing: "Funnel",
  signup_started: "Funnel",
  signup_completed: "Funnel",
  role_selected: "Funnel",
  first_session_booked: "Activation",
  first_quest_completed: "Activation",
  first_duel_played: "Activation",
  quest_started: "Engagement",
  quest_completed: "Engagement",
  duel_challenged: "Engagement",
  division_joined: "Engagement",
  clan_created: "Engagement",
  checkout_started: "Revenue",
  checkout_completed: "Revenue",
  checkout_abandoned: "Revenue",
  session_cancelled: "Revenue",
  refund_requested: "Revenue",
  session_booked: "Revenue",
  daily_login: "Retention",
  streak_maintained: "Retention",
  streak_broken: "Retention",
  level_up: "Retention",
};

const CATEGORY_COLORS: Record<string, string> = {
  Funnel: "bg-blue-50 text-blue-700",
  Activation: "bg-emerald-50 text-emerald-700",
  Engagement: "bg-violet-50 text-violet-700",
  Revenue: "bg-amber-50 text-amber-700",
  Retention: "bg-slate-100 text-slate-600",
};

// Custom tooltip for recharts
function ChartTooltip({
  active,
  payload,
  label,
  prefix = "",
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  prefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-md shadow-sm px-3 py-2 text-[12px]">
      <p className="text-slate-400 mb-1">{label ? fmtDate(label) : ""}</p>
      <p className="font-semibold text-slate-900">
        {prefix}{typeof payload[0]?.value === "number" ? payload[0].value.toLocaleString() : ""}
      </p>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export function AnalyticsDashboardClient({
  days,
  kpis,
  eventCounts,
  funnel,
  subjects,
  revenue,
  dailySignups,
  dailyQuests,
}: Props) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalRevenue = revenue.reduce((s, r) => s + r.revenue, 0);
  const maxSubject = subjects[0]?.count ?? 1;

  return (
    <div className="space-y-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-slate-900">Analytics</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">Platform activity and growth metrics</p>
        </div>
        <DayToggle days={days} />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total users"
          value={fmtNum(kpis.totalUsers)}
          sub="All time"
        />
        <KpiCard
          label="Sessions completed"
          value={fmtNum(kpis.totalSessions)}
          sub="All time"
        />
        <KpiCard
          label="Revenue"
          value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={`Last ${days} days`}
        />
        <KpiCard
          label="Active today"
          value={fmtNum(kpis.activeToday)}
          sub="Unique logins"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <SectionHeader
          title="Revenue"
          sub={`Daily completed-session revenue — last ${days} days`}
        />
        <div className="h-48 min-w-0">
          {!isMounted ? null : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={fmtDate}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                interval={days === 7 ? 0 : 4}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${v}`}
                width={48}
              />
              <Tooltip content={<ChartTooltip prefix="$" />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#0f172a"
                strokeWidth={1.5}
                fill="url(#revenueGrad)"
                dot={false}
                activeDot={{ r: 3, fill: "#0f172a", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Two-column: Signups + Quests */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <SectionHeader title="Sign-ups" sub={`Last ${days} days`} />
          <div className="h-40 min-w-0">
            {!isMounted ? null : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySignups} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval={days === 7 ? 0 : 6}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#1e293b" radius={[2, 2, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <SectionHeader title="Quest starts" sub={`Last ${days} days`} />
          <div className="h-40 min-w-0">
            {!isMounted ? null : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyQuests} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval={days === 7 ? 0 : 6}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#334155" radius={[2, 2, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Funnel + Subjects */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Activation Funnel */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <SectionHeader
            title="Activation funnel"
            sub="Sign-up → first session → second session"
          />
          {funnel.length === 0 ? (
            <p className="text-[12px] text-slate-400 py-4">No data yet.</p>
          ) : (
            <div className="space-y-4">
              {funnel.map((step) => (
                <FunnelBar key={step.step} {...step} />
              ))}
            </div>
          )}
        </div>

        {/* Popular Subjects */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <SectionHeader title="Top subjects" sub="From quests and session bookings" />
          {subjects.length === 0 ? (
            <p className="text-[12px] text-slate-400 py-4">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {subjects.map((s) => (
                <div key={s.subject} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-700">{s.subject}</span>
                    <span className="text-[11px] font-medium text-slate-500 tabular-nums">{s.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full"
                      style={{ width: `${(s.count / maxSubject) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event counts table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-slate-800">Event breakdown</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">All tracked events — last {days} days</p>
          </div>
          <span className="text-[11px] text-slate-400">{eventCounts.length} event types</span>
        </div>

        {eventCounts.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[12px] text-slate-400">No events tracked yet.</p>
            <p className="text-[11px] text-slate-300 mt-1">
              Events are recorded as users interact with the platform.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {eventCounts.map((row, i) => {
              const cat = EVENT_CATEGORY[row.event_name] ?? "Other";
              const catCls = CATEGORY_COLORS[cat] ?? "bg-slate-100 text-slate-500";
              const maxCount = eventCounts[0]?.count ?? 1;
              const pct = Math.round((row.count / maxCount) * 100);

              return (
                <div key={row.event_name} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors duration-100">
                  <span className="w-5 text-[11px] text-slate-300 tabular-nums text-right shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-medium text-slate-800 truncate">
                        {fmtEventName(row.event_name)}
                      </span>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0", catCls)}>
                        {cat}
                      </span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-300 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold text-slate-900 tabular-nums shrink-0 ml-2">
                    {fmtNum(row.count)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
