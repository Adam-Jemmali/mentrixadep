"use client";

import { useMemo, useState } from "react";
import { QuestFunctionGraph } from "@/features/quest/components/quest-function-graph";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import type { QuestStimulus } from "@/features/quest/quest-stimulus-pure";
import type {
  GraphFeatureSelection,
  GraphSketchSample,
} from "@/features/quest/quest-interaction-formats-pure";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";

/**
 * Graph answer UI with deterministic ground truth:
 * - feature mode: mark points / intervals vs authored targets
 * - sketch mode: place control points; server grades polyline vs authored f(x)
 * Live preview draws control points and polyline on the graph before lock.
 */
export function GraphFeatureQuestion({
  prompt,
  stimulus,
  maxSelections,
  targetKinds,
  sketchMode = false,
  sketchDomain = [-2, 2],
  busy,
  disabled,
  onSubmit,
}: {
  prompt: string;
  stimulus?: QuestStimulus[];
  maxSelections: number;
  targetKinds: Array<"point" | "interval">;
  sketchMode?: boolean;
  sketchDomain?: [number, number];
  busy?: boolean;
  disabled?: boolean;
  onSubmit: (payload: {
    selections?: GraphFeatureSelection[];
    sketchControls?: GraphSketchSample[];
  }) => void | Promise<void>;
}) {
  const graph = useMemo(
    () => stimulus?.find((s) => s.kind === "function_graph"),
    [stimulus],
  );
  const wantsInterval = targetKinds.includes("interval");
  const [mode, setMode] = useState<"point" | "interval" | "sketch">(
    sketchMode ? "sketch" : wantsInterval && !targetKinds.includes("point") ? "interval" : "point",
  );
  const [points, setPoints] = useState<number[]>([]);
  const [intervalDraft, setIntervalDraft] = useState<number[]>([]);
  const [intervals, setIntervals] = useState<Array<{ xMin: number; xMax: number }>>([]);
  const [controls, setControls] = useState<GraphSketchSample[]>([]);
  const [xDraft, setXDraft] = useState("");
  const [yDraft, setYDraft] = useState("");

  const addFeatureX = () => {
    const x = Number(xDraft);
    if (!Number.isFinite(x)) return;
    setXDraft("");
    if (mode === "point") {
      setPoints((prev) => [...prev, x].slice(0, maxSelections));
      return;
    }
    setIntervalDraft((prev) => {
      const next = [...prev, x];
      if (next.length >= 2) {
        const a = next[0]!;
        const b = next[1]!;
        setIntervals((ints) =>
          [...ints, { xMin: Math.min(a, b), xMax: Math.max(a, b) }].slice(0, maxSelections),
        );
        return [];
      }
      return next;
    });
  };

  const addSketchPoint = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    setControls((prev) => [...prev, { x, y }].slice(0, Math.max(8, maxSelections)));
  };

  const addSketchPointFromInputs = () => {
    const x = Number(xDraft);
    const y = Number(yDraft);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    setXDraft("");
    setYDraft("");
    addSketchPoint(x, y);
  };

  const selections: GraphFeatureSelection[] = [
    ...points.map((x) => ({ kind: "point" as const, x })),
    ...intervals.map((iv) => ({ kind: "interval" as const, ...iv })),
  ];

  const emptyAxesGraph = useMemo(
    () => ({
      kind: "function_graph" as const,
      title: "Sketch grid",
      alt: "Empty axes for sketching",
      domain: sketchDomain,
      range: [-2, 4] as [number, number],
      curves: [],
    }),
    [sketchDomain],
  );

  const activeGraph = graph?.kind === "function_graph" ? graph : emptyAxesGraph;

  return (
    <div className="space-y-4">
      <PromptWithMath text={prompt} variant="light" highlightKeyTerms />
      <QuestFunctionGraph
        graph={activeGraph}
        variant="light"
        overlay={{
          sketchControls: mode === "sketch" ? controls : undefined,
          featureXs: mode === "point" ? points : undefined,
          intervals: mode === "interval" ? intervals : undefined,
          interactive: !disabled && !busy && (mode === "sketch" || mode === "point"),
          onPlotClick: ({ x, y }) => {
            if (disabled || busy) return;
            if (mode === "sketch") {
              addSketchPoint(x, y);
              return;
            }
            if (mode === "point") {
              setPoints((prev) => [...prev, x].slice(0, maxSelections));
            }
          },
        }}
      />
      <p className="text-xs text-slate-600">
        {sketchMode || mode === "sketch"
          ? "Click the graph to place control points. Your curve preview updates live before you lock."
          : "Mark the verified features. Answers are graded automatically against authored targets."}
      </p>
      <div className="flex flex-wrap gap-2">
        {sketchMode ? (
          <button
            type="button"
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
              mode === "sketch"
                ? "border-[#2D70B3] bg-[#EFF6FF] text-[#1E3A8A]"
                : "border-slate-200 bg-white text-slate-600",
            )}
            onClick={() => setMode("sketch")}
            disabled={disabled || busy}
          >
            Sketch curve
          </button>
        ) : null}
        {!sketchMode && targetKinds.includes("point") ? (
          <button
            type="button"
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
              mode === "point"
                ? "border-[#2D70B3] bg-[#EFF6FF] text-[#1E3A8A]"
                : "border-slate-200 bg-white text-slate-600",
            )}
            onClick={() => setMode("point")}
            disabled={disabled || busy}
          >
            Point
          </button>
        ) : null}
        {!sketchMode && wantsInterval ? (
          <button
            type="button"
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
              mode === "interval"
                ? "border-[#2D70B3] bg-[#EFF6FF] text-[#1E3A8A]"
                : "border-slate-200 bg-white text-slate-600",
            )}
            onClick={() => setMode("interval")}
            disabled={disabled || busy}
          >
            Interval
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-slate-700">
          x
          <input
            type="number"
            step="any"
            value={xDraft}
            onChange={(e) => setXDraft(e.target.value)}
            disabled={disabled || busy}
            className="mt-1 block w-28 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
          />
        </label>
        {mode === "sketch" ? (
          <label className="text-sm text-slate-700">
            y
            <input
              type="number"
              step="any"
              value={yDraft}
              onChange={(e) => setYDraft(e.target.value)}
              disabled={disabled || busy}
              className="mt-1 block w-28 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
            />
          </label>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || busy || !xDraft || (mode === "sketch" && !yDraft)}
          onClick={mode === "sketch" ? addSketchPointFromInputs : addFeatureX}
        >
          Add
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || busy}
          onClick={() => {
            setPoints([]);
            setIntervals([]);
            setIntervalDraft([]);
            setControls([]);
          }}
        >
          Clear
        </Button>
      </div>
      <ul className="space-y-1 text-sm text-slate-700">
        {mode === "sketch"
          ? controls.map((p, i) => (
              <li key={`c-${i}`}>
                Control {i + 1}: ({p.x}, {p.y})
              </li>
            ))
          : null}
        {mode !== "sketch"
          ? points.map((x, i) => <li key={`p-${i}`}>Point x = {x}</li>)
          : null}
        {mode !== "sketch"
          ? intervals.map((iv, i) => (
              <li key={`i-${i}`}>
                Interval [{iv.xMin}, {iv.xMax}]
              </li>
            ))
          : null}
        {mode === "interval" && intervalDraft.length === 1 ? (
          <li className="text-slate-500">Interval start x = {intervalDraft[0]} (add end)</li>
        ) : null}
      </ul>
      <p className="text-[11px] text-slate-500">
        Domain hint for sketches: [{sketchDomain[0]}, {sketchDomain[1]}].
      </p>
      <Button
        type="button"
        disabled={
          busy ||
          disabled ||
          (sketchMode || mode === "sketch"
            ? controls.length < 2
            : selections.length === 0)
        }
        onClick={() =>
          void onSubmit(
            sketchMode || mode === "sketch"
              ? { sketchControls: controls }
              : { selections },
          )
        }
      >
        Lock graph answer
      </Button>
    </div>
  );
}
