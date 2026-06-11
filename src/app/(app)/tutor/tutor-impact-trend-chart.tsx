"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DayPoint = { date: string; impactScore: number };

function ImpactTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.value;
  const score = typeof raw === "number" ? raw : Number(raw);
  const dateLabel =
    label != null
      ? new Date(String(label) + "T12:00:00.000Z").toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      : "";

  return (
    <div className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm">
      <div className="text-slate-500">{dateLabel}</div>
      <div className="mt-0.5 font-medium text-slate-900">
        {Number.isFinite(score) ? `${score.toFixed(1)}` : "—"}
        <span className="ml-1 font-normal text-slate-500">avg impact</span>
      </div>
    </div>
  );
}

export function TutorImpactTrendChart({ data }: { data: DayPoint[] }) {
  const chartData = data.filter((d) => d.impactScore > 0);

  if (chartData.length === 0) {
    return (
      <p className="flex h-[220px] items-center justify-center text-sm text-slate-500">
        Impact history builds after your first daily score sync.
      </p>
    );
  }

  return (
    <div className="h-[220px] w-full min-w-0 min-h-[220px]">
      <ResponsiveContainer width="100%" height={220} debounce={50}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickFormatter={(v) =>
              new Date(String(v) + "T12:00:00.000Z").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })
            }
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748b" }}
            width={32}
            domain={[0, 100]}
          />
          <Tooltip content={<ImpactTooltip />} />
          <Area
            type="monotone"
            dataKey="impactScore"
            stroke="#4F46E5"
            fill="#4F46E520"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
