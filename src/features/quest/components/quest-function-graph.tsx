"use client";

import { useMemo } from "react";
import { create, all, type FactoryFunctionMap } from "mathjs";
import {
  inferGraphDomain,
  inferGraphRange,
  riemannBarCenters,
  sampleCurvePoints,
  type QuestStimulusFunctionGraph,
} from "@/features/quest/quest-stimulus-pure";
import { cn } from "@/shared/core/utils";

const math = create(all as FactoryFunctionMap, {});

const CURVE_COLORS = ["#7C3AED", "#6366F1", "#22D3EE"];

function evaluateExpression(expression: string, x: number): number | null {
  try {
    const value = math.evaluate(expression.replace(/\*\*/g, "^"), { x });
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function QuestFunctionGraph({
  graph,
  variant = "light",
  className,
}: {
  graph: QuestStimulusFunctionGraph;
  variant?: "light" | "dark";
  className?: string;
}) {
  const isDark = variant === "dark";
  const width = 560;
  const height = 320;
  const pad = { top: 28, right: 24, bottom: 44, left: 48 };

  const plot = useMemo(() => {
    const domain = inferGraphDomain(graph);
    const curveSamples = (graph.curves ?? []).map((curve, index) => ({
      ...curve,
      color: curve.color || CURVE_COLORS[index % CURVE_COLORS.length]!,
      points: sampleCurvePoints(curve.expression, domain, 80, evaluateExpression),
    }));

    const riemannBars =
      graph.riemann != null
        ? riemannBarCenters(graph.riemann).map((bar, index) => {
            const heightValue =
              graph.riemann?.heights?.[index] ??
              (graph.riemann?.expression
                ? evaluateExpression(graph.riemann.expression, bar.xSample)
                : null);
            return { ...bar, height: heightValue ?? 0 };
          })
        : [];

    const plottedYs = [
      ...curveSamples.flatMap((c) => c.points.map((p) => p.y)),
      ...riemannBars.map((b) => b.height),
    ];
    const range = inferGraphRange(graph, plottedYs);

    const xScale = (x: number) =>
      pad.left + ((x - domain[0]) / (domain[1] - domain[0])) * (width - pad.left - pad.right);
    const yScale = (y: number) =>
      pad.top + ((range[1] - y) / (range[1] - range[0])) * (height - pad.top - pad.bottom);

    return { domain, range, curveSamples, riemannBars, xScale, yScale };
  }, [graph]);

  const axisColor = isDark ? "#94A3B8" : "#64748B";
  const gridColor = isDark ? "rgba(148,163,184,0.18)" : "rgba(100,116,139,0.18)";
  const zeroColor = isDark ? "rgba(148,163,184,0.45)" : "rgba(100,116,139,0.45)";

  const xTicks = 5;
  const yTicks = 4;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        isDark ? "border-[#1e293b] bg-[#0B1220]" : "border-slate-200 bg-white",
        className,
      )}
    >
      {graph.title ? (
        <p
          className={cn(
            "border-b px-4 py-2.5 text-[12px] font-medium",
            isDark ? "border-[#1e293b] text-slate-300" : "border-slate-100 text-slate-700",
          )}
        >
          {graph.title}
        </p>
      ) : null}
      <div className="px-2 py-2 sm:px-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={graph.alt}
          className="h-auto w-full"
        >
          {Array.from({ length: xTicks + 1 }, (_, i) => {
            const t = i / xTicks;
            const x = plot.domain[0] + (plot.domain[1] - plot.domain[0]) * t;
            const px = plot.xScale(x);
            return (
              <g key={`vx-${i}`}>
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={height - pad.bottom}
                  stroke={gridColor}
                  strokeWidth={1}
                />
                <text
                  x={px}
                  y={height - 16}
                  textAnchor="middle"
                  className="fill-current text-[11px]"
                  fill={axisColor}
                >
                  {Number(x.toFixed(2))}
                </text>
              </g>
            );
          })}
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const t = i / yTicks;
            const y = plot.range[0] + (plot.range[1] - plot.range[0]) * t;
            const py = plot.yScale(y);
            return (
              <g key={`hy-${i}`}>
                <line
                  x1={pad.left}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke={gridColor}
                  strokeWidth={1}
                />
                <text
                  x={pad.left - 8}
                  y={py + 3}
                  textAnchor="end"
                  className="fill-current text-[11px]"
                  fill={axisColor}
                >
                  {Number(y.toFixed(2))}
                </text>
              </g>
            );
          })}

          {plot.range[0] <= 0 && plot.range[1] >= 0 ? (
            <line
              x1={pad.left}
              y1={plot.yScale(0)}
              x2={width - pad.right}
              y2={plot.yScale(0)}
              stroke={zeroColor}
              strokeWidth={1.5}
            />
          ) : null}
          {plot.domain[0] <= 0 && plot.domain[1] >= 0 ? (
            <line
              x1={plot.xScale(0)}
              y1={pad.top}
              x2={plot.xScale(0)}
              y2={height - pad.bottom}
              stroke={zeroColor}
              strokeWidth={1.5}
            />
          ) : null}

          {plot.riemannBars.map((bar, index) => {
            const x1 = plot.xScale(bar.xLeft);
            const x2 = plot.xScale(bar.xRight);
            const y0 = plot.yScale(0);
            const y1 = plot.yScale(bar.height);
            const top = Math.min(y0, y1);
            const h = Math.abs(y1 - y0);
            return (
              <rect
                key={`bar-${index}`}
                x={x1}
                y={top}
                width={Math.max(1, x2 - x1)}
                height={Math.max(1, h)}
                fill="rgba(124,58,237,0.22)"
                stroke="#7C3AED"
                strokeWidth={1.25}
              />
            );
          })}

          {plot.curveSamples.map((curve, index) => {
            if (curve.points.length < 2) return null;
            const d = curve.points
              .map((p, i) => `${i === 0 ? "M" : "L"} ${plot.xScale(p.x)} ${plot.yScale(p.y)}`)
              .join(" ");
            return (
              <path
                key={`curve-${index}`}
                d={d}
                fill="none"
                stroke={curve.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}

          {(graph.points ?? []).map((point, index) => (
            <g key={`pt-${index}`}>
              <circle
                cx={plot.xScale(point.x)}
                cy={plot.yScale(point.y)}
                r={4}
                fill="#6366F1"
                stroke={isDark ? "#0B1220" : "#FFFFFF"}
                strokeWidth={1.5}
              />
              {point.label ? (
                <text
                  x={plot.xScale(point.x)}
                  y={plot.yScale(point.y) - 10}
                  textAnchor="middle"
                  fill={axisColor}
                  className="text-[10px]"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          ))}

          <text
            x={(pad.left + width - pad.right) / 2}
            y={height - 4}
            textAnchor="middle"
            fill={axisColor}
            className="text-[11px]"
          >
            {graph.xLabel ?? "x"}
          </text>
          <text
            x={14}
            y={(pad.top + height - pad.bottom) / 2}
            textAnchor="middle"
            fill={axisColor}
            className="text-[11px]"
            transform={`rotate(-90 14 ${(pad.top + height - pad.bottom) / 2})`}
          >
            {graph.yLabel ?? "y"}
          </text>
        </svg>
      </div>
    </div>
  );
}
