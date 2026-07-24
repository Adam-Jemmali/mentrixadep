"use client";

import { useMemo, useRef, type MouseEvent } from "react";
import { create, all, type FactoryFunctionMap } from "mathjs";
import {
  inferGraphDomain,
  inferGraphRange,
  normalizeGraphExpression,
  QUEST_GRAPH_CURVE_BLUE,
  riemannBarCenters,
  sampleCurvePoints,
  type QuestStimulusFunctionGraph,
} from "@/features/quest/quest-stimulus-pure";
import { cn } from "@/shared/core/utils";

const math = create(all as FactoryFunctionMap, {});

const CURVE_COLORS = [QUEST_GRAPH_CURVE_BLUE, "var(--mx-indigo)", "var(--mx-violet)"];

function evaluateExpression(expression: string, x: number): number | null {
  try {
    const normalized = normalizeGraphExpression(expression) ?? expression.replace(/\*\*/g, "^");
    const value = math.evaluate(normalized, { x });
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export type QuestGraphOverlay = {
  /** Live sketch control points / polyline preview. */
  sketchControls?: Array<{ x: number; y: number }>;
  /** Feature-mode vertical markers at selected x. */
  featureXs?: number[];
  /** Feature-mode interval highlights. */
  intervals?: Array<{ xMin: number; xMax: number }>;
  interactive?: boolean;
  onPlotClick?: (point: { x: number; y: number }) => void;
};

export function QuestFunctionGraph({
  graph,
  variant = "light",
  className,
  overlay,
}: {
  graph: QuestStimulusFunctionGraph;
  variant?: "light" | "dark";
  className?: string;
  overlay?: QuestGraphOverlay;
}) {
  const isDark = variant === "dark";
  const width = 560;
  const height = 320;
  const pad = { top: 28, right: 24, bottom: 44, left: 48 };
  const svgRef = useRef<SVGSVGElement | null>(null);

  const plot = useMemo(() => {
    const domain = inferGraphDomain(graph);
    const curveSamples = (graph.curves ?? []).map((curve, index) => {
      const expression = normalizeGraphExpression(curve.expression) ?? curve.expression;
      return {
        ...curve,
        expression,
        color: curve.color || CURVE_COLORS[index % CURVE_COLORS.length]!,
        points: sampleCurvePoints(expression, domain, 160, evaluateExpression),
      };
    });

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

    const regionPolys = (graph.regions ?? []).map((region) => {
      const samples = 48;
      const top: Array<{ x: number; y: number }> = [];
      const bottom: Array<{ x: number; y: number }> = [];
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const x = region.from + (region.to - region.from) * t;
        const yu = evaluateExpression(region.upper, x);
        const yl = evaluateExpression(region.lower, x);
        if (yu == null || yl == null) continue;
        top.push({ x, y: Math.max(yu, yl) });
        bottom.push({ x, y: Math.min(yu, yl) });
      }
      return { region, top, bottom };
    });

    const plottedYs = [
      ...curveSamples.flatMap((c) => c.points.map((p) => p.y)),
      ...riemannBars.map((b) => b.height),
      ...regionPolys.flatMap((r) => [...r.top, ...r.bottom].map((p) => p.y)),
      ...(graph.guides ?? []).filter((g) => g.kind === "yEquals").map((g) => g.value),
      ...(overlay?.sketchControls ?? []).map((p) => p.y),
    ];
    const range = inferGraphRange(graph, plottedYs);

    const xScale = (x: number) =>
      pad.left + ((x - domain[0]) / (domain[1] - domain[0])) * (width - pad.left - pad.right);
    const yScale = (y: number) =>
      pad.top + ((range[1] - y) / (range[1] - range[0])) * (height - pad.top - pad.bottom);

    return { domain, range, curveSamples, riemannBars, regionPolys, xScale, yScale };
  }, [graph, overlay?.sketchControls]);

  const axisColor = isDark ? "#94A3B8" : "#64748B";
  const gridColor = isDark ? "rgba(148,163,184,0.18)" : "rgba(100,116,139,0.18)";
  const zeroColor = isDark ? "rgba(148,163,184,0.45)" : "rgba(100,116,139,0.45)";

  const xTicks = 5;
  const yTicks = 4;

  const handleSvgClick = (event: MouseEvent<SVGSVGElement>) => {
    if (!overlay?.interactive || !overlay.onPlotClick || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const py = ((event.clientY - rect.top) / rect.height) * height;
    if (
      px < pad.left ||
      px > width - pad.right ||
      py < pad.top ||
      py > height - pad.bottom
    ) {
      return;
    }
    const x =
      plot.domain[0] +
      ((px - pad.left) / (width - pad.left - pad.right)) * (plot.domain[1] - plot.domain[0]);
    const y =
      plot.range[1] -
      ((py - pad.top) / (height - pad.top - pad.bottom)) * (plot.range[1] - plot.range[0]);
    overlay.onPlotClick({
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    });
  };

  const sketch = overlay?.sketchControls ?? [];
  const sketchPath =
    sketch.length >= 2
      ? [...sketch]
          .sort((a, b) => a.x - b.x)
          .map((p, i) => `${i === 0 ? "M" : "L"} ${plot.xScale(p.x)} ${plot.yScale(p.y)}`)
          .join(" ")
      : "";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        isDark ? "border-[var(--mx-surface-3)] bg-[var(--mx-navy)]" : "border-slate-200 bg-white",
        className,
      )}
    >
      {graph.title ? (
        <p
          className={cn(
            "border-b px-4 py-2.5 text-[12px] font-medium",
            isDark ? "border-[var(--mx-surface-3)] text-slate-300" : "border-slate-100 text-slate-700",
          )}
        >
          {graph.title}
        </p>
      ) : null}
      <div className="px-2 py-2 sm:px-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={graph.alt}
          className={cn("h-auto w-full", overlay?.interactive ? "cursor-crosshair" : null)}
          onClick={handleSvgClick}
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

          {plot.regionPolys.map((entry, index) => {
            if (entry.top.length < 2 || entry.bottom.length < 2) return null;
            const path = [
              ...entry.top.map(
                (p, i) => `${i === 0 ? "M" : "L"} ${plot.xScale(p.x)} ${plot.yScale(p.y)}`,
              ),
              ...[...entry.bottom].reverse().map((p) => `L ${plot.xScale(p.x)} ${plot.yScale(p.y)}`),
              "Z",
            ].join(" ");
            return (
              <path
                key={`region-${index}`}
                d={path}
                fill={entry.region.fill ?? "rgba(45,112,179,0.22)"}
                stroke="none"
              />
            );
          })}

          {(overlay?.intervals ?? []).map((iv, index) => {
            const x1 = plot.xScale(iv.xMin);
            const x2 = plot.xScale(iv.xMax);
            return (
              <rect
                key={`ov-int-${index}`}
                x={Math.min(x1, x2)}
                y={pad.top}
                width={Math.max(2, Math.abs(x2 - x1))}
                height={height - pad.top - pad.bottom}
                fill="rgba(99,102,241,0.16)"
                stroke="var(--mx-indigo)"
                strokeWidth={1}
              />
            );
          })}

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
                fill="rgba(45,112,179,0.18)"
                stroke={QUEST_GRAPH_CURVE_BLUE}
                strokeWidth={1.25}
              />
            );
          })}

          {(graph.guides ?? []).map((guide, index) => {
            if (guide.kind === "yEquals") {
              const py = plot.yScale(guide.value);
              return (
                <g key={`guide-y-${index}`}>
                  <line
                    x1={pad.left}
                    y1={py}
                    x2={width - pad.right}
                    y2={py}
                    stroke={guide.color || "var(--mx-violet)"}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  {guide.label ? (
                    <text
                      x={width - pad.right - 4}
                      y={py - 6}
                      textAnchor="end"
                      fill={guide.color || "var(--mx-violet)"}
                      className="text-[10px] font-semibold"
                    >
                      {guide.label}
                    </text>
                  ) : null}
                </g>
              );
            }
            const px = plot.xScale(guide.value);
            return (
              <g key={`guide-x-${index}`}>
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={height - pad.bottom}
                  stroke={guide.color || "var(--mx-violet)"}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                {guide.label ? (
                  <text
                    x={px + 4}
                    y={pad.top + 12}
                    fill={guide.color || "var(--mx-violet)"}
                    className="text-[10px] font-semibold"
                  >
                    {guide.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {plot.curveSamples.map((curve, index) => {
            if (curve.points.length < 2) return null;
            const segments: Array<Array<{ x: number; y: number }>> = [];
            let current: Array<{ x: number; y: number }> = [];
            const ySpan = Math.max(1, plot.range[1] - plot.range[0]);
            for (let i = 0; i < curve.points.length; i++) {
              const p = curve.points[i]!;
              const prev = current[current.length - 1];
              if (prev && Math.abs(p.y - prev.y) > ySpan * 1.75) {
                if (current.length >= 2) segments.push(current);
                current = [p];
              } else {
                current.push(p);
              }
            }
            if (current.length >= 2) segments.push(current);

            return segments.map((segment, segIndex) => {
              const d = segment
                .map((p, i) => `${i === 0 ? "M" : "L"} ${plot.xScale(p.x)} ${plot.yScale(p.y)}`)
                .join(" ");
              return (
                <path
                  key={`curve-${index}-${segIndex}`}
                  d={d}
                  fill="none"
                  stroke={curve.color}
                  strokeWidth={2.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              );
            });
          })}

          {(graph.points ?? []).map((point, index) => (
            <g key={`pt-${index}`}>
              <circle
                cx={plot.xScale(point.x)}
                cy={plot.yScale(point.y)}
                r={4}
                fill="var(--mx-indigo)"
                stroke={isDark ? "var(--mx-navy)" : "#FFFFFF"}
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

          {(overlay?.featureXs ?? []).map((x, index) => (
            <line
              key={`fx-${index}`}
              x1={plot.xScale(x)}
              y1={pad.top}
              x2={plot.xScale(x)}
              y2={height - pad.bottom}
              stroke="var(--mx-violet)"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          ))}

          {sketchPath ? (
            <path
              d={sketchPath}
              fill="none"
              stroke="var(--mx-violet)"
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {sketch.map((p, index) => (
            <g key={`sk-${index}`}>
              <circle
                cx={plot.xScale(p.x)}
                cy={plot.yScale(p.y)}
                r={5.5}
                fill="var(--mx-violet)"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              <text
                x={plot.xScale(p.x)}
                y={plot.yScale(p.y) - 12}
                textAnchor="middle"
                fill="var(--mx-violet)"
                className="text-[10px] font-semibold"
              >
                {index + 1}
              </text>
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
