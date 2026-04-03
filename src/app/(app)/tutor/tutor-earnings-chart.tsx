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

type DayPoint = { date: string; cents: number };

function EarningsTooltip({
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
  const dollars = typeof raw === "number" ? raw : Number(raw);
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
        {Number.isFinite(dollars) ? `$${dollars.toFixed(2)}` : "—"}
        <span className="ml-1 font-normal text-slate-500">completed</span>
      </div>
    </div>
  );
}

export function TutorEarningsChart({ data }: { data: DayPoint[] }) {
  const chartData = data.map((d) => ({
    date: d.date,
    dollars: Math.round((d.cents / 100) * 100) / 100,
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => {
              const d = new Date(String(v) + "T12:00:00.000Z");
              return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => `$${v}`}
            width={44}
          />
          <Tooltip content={<EarningsTooltip />} />
          <Area
            type="monotone"
            dataKey="dollars"
            stroke="#2563eb"
            strokeWidth={1.5}
            fill="#2563eb"
            fillOpacity={0.1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
