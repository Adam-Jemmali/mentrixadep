"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; accuracy: number };

const AXIS_TICK = { fontSize: 10, fill: "#94a3b8" };

function AccuracyTooltip({
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
  const accuracy = typeof raw === "number" ? raw : Number(raw);
  const dateLabel =
    label != null
      ? new Date(String(label) + "T12:00:00.000Z").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      : "";

  return (
    <div className="rounded-lg border border-indigo-400/40 bg-[var(--mx-navy-2)] px-2.5 py-1.5 text-xs shadow-lg">
      <div className="text-slate-300">{dateLabel}</div>
      <div className="mt-0.5 font-semibold text-white">
        {Number.isFinite(accuracy) ? `${accuracy}%` : "—"}
        <span className="ml-1 font-normal text-slate-300">accuracy</span>
      </div>
    </div>
  );
}

export function RankCardAccuracyChart({ data }: { data: Point[] }) {
  const hasData = data.some((d) => d.accuracy > 0);

  if (!hasData) {
    return (
      <p className="flex h-[180px] items-center justify-center text-sm text-slate-300">
        Quest accuracy trend builds as you complete more quests.
      </p>
    );
  }

  return (
    <div className="h-[180px] w-full min-w-0">
      <ResponsiveContainer width="100%" height={180} debounce={50}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
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
          <YAxis tick={AXIS_TICK} width={32} domain={[0, 100]} />
          <Tooltip content={<AccuracyTooltip />} />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="#a5b4fc"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#c7d2fe" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
