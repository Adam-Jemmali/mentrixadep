"use client";

import type { PlatformMetrics } from "@/features/admin/admin-dashboard";


import Link from "next/link";
import {
  Users,
  BookOpen,
  DollarSign,
  Zap,
  Clock,
  Swords,
  Shield,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

import type { RegistrationRequest } from "@/shared/types/database";

interface UnverifiedCourse {
  id: string;
  tutor_id: string;
  course_name: string;
  proof_description: string;
  tutor_email: string | null;
  created_at: string;
}

interface Props {
  metrics: PlatformMetrics | null;
  pendingRequests: RegistrationRequest[];
  unverifiedCourses: UnverifiedCourse[];
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-200 group metric-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ?? "bg-slate-100"}`}>
          <Icon className="w-4 h-4 text-slate-600" strokeWidth={1.8} />
        </div>
        {href && (
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        )}
      </div>
      <p className="text-[24px] font-semibold text-slate-900 leading-none tracking-tight">{value}</p>
      <p className="text-[12px] text-slate-500 mt-1.5 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const m = Math.floor(delta / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminDashboardClient({ metrics, pendingRequests, unverifiedCourses }: Props) {
  const m = metrics;

  return (
    <div className="max-w-6xl mx-auto dash-animate-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">Platform Overview</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Live snapshot · auto-refreshes every 30 seconds
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total users"
          value={m?.totalUsers ?? "—"}
          sub={m ? `${m.studentCount} learners · ${m.tutorCount} guides` : undefined}
          icon={Users}
          accent="bg-blue-50"
          href="/admin/users"
        />
        <MetricCard
          label="Sessions this month"
          value={m?.sessionsMonth ?? "—"}
          sub={m ? `${m.sessionsToday} today · ${m.sessionsWeek} this week` : undefined}
          icon={BookOpen}
          accent="bg-emerald-50"
        />
        <MetricCard
          label="Revenue this month"
          value={m ? `$${(m.revenueMonth / 100).toFixed(0)}` : "—"}
          sub="Gross session value"
          icon={DollarSign}
          accent="bg-amber-50"
        />
        <MetricCard
          label="Active quests"
          value={m?.activeQuests ?? "—"}
          sub="In-progress right now"
          icon={Zap}
          accent="bg-violet-50"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <MetricCard
          label="Pending approvals"
          value={m?.pendingApprovals ?? "—"}
          sub="Awaiting review"
          icon={Clock}
          accent="bg-orange-50"
          href="/admin/registrations"
        />
        <MetricCard
          label="Active duels"
          value={m?.activeDuels ?? "—"}
          sub="Live right now"
          icon={Swords}
          accent="bg-red-50"
        />
        <MetricCard
          label="Division wars"
          value={m?.activeDivisionWars ?? "—"}
          sub="Active this week"
          icon={Shield}
          accent="bg-teal-50"
        />
        <MetricCard
          label="Course reviews"
          value={unverifiedCourses.length}
          sub="Pending verification"
          icon={CheckCircle2}
          accent="bg-slate-100"
          href="/admin/users"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <MetricCard
          label="Security events"
          value={m?.securityEvents24h ?? "—"}
          sub="Last 24 hours"
          icon={AlertCircle}
          accent={m && m.securityEvents24h > 0 ? "bg-amber-50" : "bg-slate-100"}
        />
      </div>

      {/* Two-column lower sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending registrations */}
        <div className="dash-section bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-slate-900">Pending Registrations</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{pendingRequests.length} awaiting review</p>
            </div>
            <Link
              href="/admin/registrations"
              className="text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[13px] text-slate-500">Queue is clear</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {pendingRequests.slice(0, 5).map((req) => (
                <div key={req.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">{req.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${req.role === "tutor" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                        {req.role === "tutor" ? "Guide" : "Learner"}
                      </span>
                      <span className="text-[11px] text-slate-400">{relativeTime(req.created_at)}</span>
                    </div>
                  </div>
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.8} />
                </div>
              ))}
              {pendingRequests.length > 5 && (
                <div className="px-5 py-3">
                  <Link href="/admin/registrations" className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">
                    +{pendingRequests.length - 5} more →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="dash-section bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <p className="text-[13px] font-semibold text-slate-900">Quick Actions</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Common admin operations</p>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {[
              { href: "/admin/registrations", label: "Review tutor applications", sub: `${pendingRequests.filter(r => r.role === "tutor").length} pending`, icon: ClipboardCheck },
              { href: "/admin/users", label: "Manage all users", sub: `${m?.totalUsers ?? 0} total`, icon: Users },
              { href: "/admin/settings", label: "Platform settings", sub: "Features, fees, limits", icon: SettingsIcon },
            ].map(({ href, label, sub, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                  <Icon className="w-4 h-4 text-slate-500" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800">{label}</p>
                  <p className="text-[11px] text-slate-400">{sub}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </Link>
            ))}
          </div>

          {/* Platform health indicators */}
          <div className="px-5 py-4 bg-[#F9FAFB] border-t border-[#F3F4F6]">
            <p className="text-[11px] font-medium text-slate-500 mb-3">Platform Health</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-1" />
                <p className="text-[10px] text-slate-500">Auth</p>
              </div>
              <div className="text-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-1" />
                <p className="text-[10px] text-slate-500">Database</p>
              </div>
              <div className="text-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-1" />
                <p className="text-[10px] text-slate-500">Payments</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions trend row */}
      <div className="mt-6 dash-section bg-white border border-[#E5E7EB] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-slate-900">Session Activity</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Rolling 30-day window</p>
          </div>
          <TrendingUp className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Today", value: m?.sessionsToday ?? 0, max: Math.max(m?.sessionsToday ?? 0, 1) },
            { label: "This week", value: m?.sessionsWeek ?? 0, max: Math.max(m?.sessionsWeek ?? 0, 1) },
            { label: "This month", value: m?.sessionsMonth ?? 0, max: Math.max(m?.sessionsMonth ?? 0, 1) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="flex items-end justify-between mb-2">
                <p className="text-[11px] text-slate-500 font-medium">{label}</p>
                <p className="text-[18px] font-semibold text-slate-900 leading-none">{value}</p>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      label === "Today" ? (value / Math.max(m?.sessionsMonth ?? 1, 1)) * 100 * 30 :
                      label === "This week" ? (value / Math.max(m?.sessionsMonth ?? 1, 1)) * 100 * 4.3 :
                      100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Icon aliases for the quick actions section
function ClipboardCheck(props: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SettingsIcon(props: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 0-14.14 0" />
      <path d="M4.93 19.07a10 10 0 0 0 14.14 0" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.22 4.22 1.42 1.42" />
      <path d="m18.36 18.36 1.42 1.42" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.22 19.78 1.42-1.42" />
      <path d="m18.36 5.64 1.42-1.42" />
    </svg>
  );
}
