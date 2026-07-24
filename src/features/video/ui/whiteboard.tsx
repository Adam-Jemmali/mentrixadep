"use client";

/**
 * Whiteboard — collaborative canvas with pen, shapes, text, eraser.
 * Real-time sync via Supabase Realtime broadcast channel.
 * Snapshot export for AI Studio output at session end.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Pen,
  Square,
  Circle,
  Type,
  Eraser,
  Trash2,
  Download,
  Minus,
  type LucideIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool = "pen" | "line" | "rect" | "ellipse" | "text" | "eraser";

interface DrawEvent {
  tool: Tool;
  color: string;
  lineWidth: number;
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  text?: string;
}

interface BroadcastPayload {
  type: "draw" | "clear" | "request-sync" | "state-sync";
  event?: DrawEvent;
  history?: DrawEvent[];
  authorId: string;
}

interface WhiteboardProps {
  channel: RealtimeChannel | null;
  userId: string;
  onSnapshot?: (dataUrl: string) => void;
  onActivitySummaryChange?: (summary: {
    drawEvents: number;
    clearEvents: number;
    byTool: Record<string, number>;
    recentEvents: Array<{ tool: string; at: number; source: "local" | "remote" }>;
  }) => void;
}

// ─── Colours ─────────────────────────────────────────────────────────────────

const COLORS = [
  "#f1f5f9", // white-ish
  "#94a3b8", // slate
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "var(--color-violet-500)", // violet
];

const LINE_WIDTHS = [2, 4, 8];

// ─── Tool config ─────────────────────────────────────────────────────────────

const TOOLS: { id: Tool; icon: LucideIcon; label: string }[] = [
  { id: "pen", icon: Pen, label: "Pen" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "ellipse", icon: Circle, label: "Ellipse" },
  { id: "text", icon: Type, label: "Text" },
];

// ─── Drawing renderer ─────────────────────────────────────────────────────────

function renderEvent(ctx: CanvasRenderingContext2D, ev: DrawEvent) {
  ctx.globalCompositeOperation =
    ev.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = ev.color;
  ctx.fillStyle = ev.color;
  ctx.lineWidth = ev.lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (ev.tool) {
    case "pen":
    case "eraser": {
      const pts = ev.points ?? [];
      if (pts.length < 2) {
        if (pts[0]) {
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, ev.lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i]!.x, pts[i]!.y);
      }
      ctx.stroke();
      break;
    }
    case "line": {
      if (ev.x1 == null) return;
      ctx.beginPath();
      ctx.moveTo(ev.x1, ev.y1!);
      ctx.lineTo(ev.x2!, ev.y2!);
      ctx.stroke();
      break;
    }
    case "rect": {
      if (ev.x == null) return;
      ctx.beginPath();
      ctx.strokeRect(ev.x, ev.y!, ev.w!, ev.h!);
      break;
    }
    case "ellipse": {
      if (ev.x == null) return;
      ctx.beginPath();
      ctx.ellipse(
        ev.x + ev.w! / 2,
        ev.y! + ev.h! / 2,
        Math.abs(ev.w! / 2),
        Math.abs(ev.h! / 2),
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      break;
    }
    case "text": {
      if (!ev.text || ev.x == null) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.font = `${ev.lineWidth * 5}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(ev.text, ev.x, ev.y!);
      break;
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Whiteboard({ channel, userId, onSnapshot, onActivitySummaryChange }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]!);
  const [lineWidth, setLineWidth] = useState(LINE_WIDTHS[0]!);
  const [isDrawing, setIsDrawing] = useState(false);

  const pendingPointsRef = useRef<{ x: number; y: number }[]>([]);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const snapshotBeforeShapeRef = useRef<ImageData | null>(null);
  const historyRef = useRef<DrawEvent[]>([]);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");
  const activitySummaryRef = useRef<{
    drawEvents: number;
    clearEvents: number;
    byTool: Record<string, number>;
    recentEvents: Array<{ tool: string; at: number; source: "local" | "remote" }>;
  }>({
    drawEvents: 0,
    clearEvents: 0,
    byTool: {},
    recentEvents: [],
  });

  const pushActivity = useCallback(
    (tool: string, source: "local" | "remote") => {
      const next = activitySummaryRef.current;
      if (tool === "clear") {
        next.clearEvents += 1;
      } else {
        next.drawEvents += 1;
        next.byTool[tool] = (next.byTool[tool] ?? 0) + 1;
      }
      next.recentEvents.push({ tool, at: Date.now(), source });
      if (next.recentEvents.length > 80) {
        next.recentEvents = next.recentEvents.slice(-80);
      }
      onActivitySummaryChange?.({
        drawEvents: next.drawEvents,
        clearEvents: next.clearEvents,
        byTool: { ...next.byTool },
        recentEvents: [...next.recentEvents],
      });
    },
    [onActivitySummaryChange],
  );

  // Sync canvas size to container
  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      // Preserve existing drawing
      const ctx = canvas.getContext("2d");
      let snap: ImageData | null = null;
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);
      // Redraw history
      if (ctx) {
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (snap) {
          ctx.putImageData(snap, 0, 0);
        } else {
          historyRef.current.forEach((ev) => renderEvent(ctx, ev));
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initial background fill
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width || 800, canvas.height || 500);
  }, []);

  const broadcast = useCallback((payload: BroadcastPayload) => {
    if (!channel) return;
    void channel.send({ type: "broadcast", event: "whiteboard", payload });
  }, [channel]);

  // Subscribe to remote draw events
  useEffect(() => {
    if (!channel) return;
    const sub = channel.on(
      "broadcast",
      { event: "whiteboard" },
      ({ payload }: { payload: BroadcastPayload }) => {
        if (payload.authorId === userId) return;
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        if (payload.type === "request-sync") {
          // Send current history to the new participant
          broadcast({ type: "state-sync", history: historyRef.current, authorId: userId });
          return;
        }

        if (payload.type === "state-sync") {
          if (payload.history && historyRef.current.length === 0) {
            historyRef.current = payload.history;
            payload.history.forEach((ev) => renderEvent(ctx, ev));
          }
          return;
        }

        if (payload.type === "clear") {
          ctx.fillStyle = "#111";
          ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          historyRef.current = [];
          pushActivity("clear", "remote");
          return;
        }
        if (payload.event) {
          renderEvent(ctx, payload.event);
          historyRef.current.push(payload.event);
          pushActivity(payload.event.tool, "remote");
        }
      }
    );

    // Immediately request state from peers when joined
    broadcast({ type: "request-sync", authorId: userId });
    return () => {
      void sub.unsubscribe();
    };
  }, [channel, userId, pushActivity, broadcast]);

  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (tool === "text") return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const pos = getCanvasPos(e);
      setIsDrawing(true);

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      if (tool === "pen" || tool === "eraser") {
        pendingPointsRef.current = [pos];
      } else {
        shapeStartRef.current = pos;
        snapshotBeforeShapeRef.current = ctx.getImageData(
          0,
          0,
          canvasRef.current!.width,
          canvasRef.current!.height
        );
      }
    },
    [tool]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const pos = getCanvasPos(e);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      if (tool === "pen" || tool === "eraser") {
        pendingPointsRef.current.push(pos);
        const pts = pendingPointsRef.current;
        const last = pts[pts.length - 2];
        if (!last) return;
        ctx.globalCompositeOperation =
          tool === "eraser" ? "destination-out" : "source-over";
        ctx.strokeStyle = color;
        ctx.lineWidth = tool === "eraser" ? lineWidth * 4 : lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (shapeStartRef.current && snapshotBeforeShapeRef.current) {
        // Restore snapshot then draw preview
        ctx.putImageData(snapshotBeforeShapeRef.current, 0, 0);
        const ev: DrawEvent = {
          tool,
          color,
          lineWidth,
          x1: shapeStartRef.current.x,
          y1: shapeStartRef.current.y,
          x2: pos.x,
          y2: pos.y,
          x: shapeStartRef.current.x,
          y: shapeStartRef.current.y,
          w: pos.x - shapeStartRef.current.x,
          h: pos.y - shapeStartRef.current.y,
        };
        renderEvent(ctx, ev);
      }
    },
    [isDrawing, tool, color, lineWidth]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      setIsDrawing(false);
      const pos = getCanvasPos(e);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      let ev: DrawEvent | null = null;

      if (tool === "pen" || tool === "eraser") {
        ev = {
          tool,
          color,
          lineWidth: tool === "eraser" ? lineWidth * 4 : lineWidth,
          points: [...pendingPointsRef.current],
        };
        pendingPointsRef.current = [];
      } else if (shapeStartRef.current) {
        ev = {
          tool,
          color,
          lineWidth,
          x1: shapeStartRef.current.x,
          y1: shapeStartRef.current.y,
          x2: pos.x,
          y2: pos.y,
          x: shapeStartRef.current.x,
          y: shapeStartRef.current.y,
          w: pos.x - shapeStartRef.current.x,
          h: pos.y - shapeStartRef.current.y,
        };
        shapeStartRef.current = null;
        snapshotBeforeShapeRef.current = null;
      }

      if (ev) {
        historyRef.current.push(ev);
        broadcast({ type: "draw", event: ev, authorId: userId });
        pushActivity(ev.tool, "local");
      }
    },
    [isDrawing, tool, color, lineWidth, userId, broadcast, pushActivity]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool !== "text") return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const scaleX = canvasRef.current!.width / rect.width;
      const scaleY = canvasRef.current!.height / rect.height;
      setTextPos({
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      });
      setTextValue("");
      setTimeout(() => textInputRef.current?.focus(), 50);
    },
    [tool]
  );

  const commitText = useCallback(() => {
    if (!textPos || !textValue.trim()) {
      setTextPos(null);
      return;
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const ev: DrawEvent = {
      tool: "text",
      color,
      lineWidth,
      x: textPos.x,
      y: textPos.y,
      text: textValue.trim(),
    };
    renderEvent(ctx, ev);
    historyRef.current.push(ev);
    broadcast({ type: "draw", event: ev, authorId: userId });
    pushActivity(ev.tool, "local");
    setTextPos(null);
    setTextValue("");
  }, [textPos, textValue, color, lineWidth, userId, broadcast, pushActivity]);

  const clearBoard = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    historyRef.current = [];
    broadcast({ type: "clear", authorId: userId });
    pushActivity("clear", "local");
  }, [userId, broadcast, pushActivity]);

  const downloadSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    onSnapshot?.(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whiteboard-${Date.now()}.png`;
    a.click();
  }, [onSnapshot]);

  return (
    <div className="flex flex-col h-full bg-[#111] rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8 bg-black/40 flex-wrap">
        {/* Tools */}
        <div className="flex items-center gap-1">
          {TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              title={label}
              className={`flex h-7 w-7 items-center justify-center rounded transition-all duration-100 ${
                tool === id
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/8"
              }`}
            >
              <Icon size={13} strokeWidth={2} />
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Colours */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              className={`h-5 w-5 rounded-full border-2 transition-all duration-100 ${
                color === c ? "border-white scale-110" : "border-transparent hover:scale-105"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Line widths */}
        <div className="flex items-center gap-1.5">
          {LINE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`flex items-center justify-center h-7 px-2 rounded transition-all duration-100 ${
                lineWidth === w ? "bg-white/15" : "hover:bg-white/8"
              }`}
            >
              <div
                className="rounded-full bg-white"
                style={{ width: w * 2.5, height: w * 2.5 }}
              />
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={downloadSnapshot}
            title="Download snapshot"
            className="flex h-7 w-7 items-center justify-center rounded text-white/40 hover:text-white/70 hover:bg-white/8 transition-all duration-100"
          >
            <Download size={13} />
          </button>
          <button
            onClick={clearBoard}
            title="Clear board"
            className="flex h-7 w-7 items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          style={{
            cursor:
              tool === "eraser"
                ? "cell"
                : tool === "text"
                  ? "text"
                  : "crosshair",
            width: "100%",
            height: "100%",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleCanvasClick}
        />

        {/* Floating text input */}
        {textPos && (
          <div
            className="absolute z-10"
            style={{
              left: `${(textPos.x / (canvasRef.current?.width ?? 1)) * 100}%`,
              top: `${(textPos.y / (canvasRef.current?.height ?? 1)) * 100}%`,
            }}
          >
            <input
              ref={textInputRef}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") setTextPos(null);
              }}
              onBlur={commitText}
              className="rounded border border-white/20 bg-black/70 px-2 py-1 text-sm text-white outline-none focus:border-white/40 min-w-[120px]"
              placeholder="Type and press Enter"
              style={{ color }}
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Snapshot export helper ───────────────────────────────────────────────────

export function getWhiteboardSnapshot(canvas: HTMLCanvasElement | null): string | null {
  if (!canvas) return null;
  return canvas.toDataURL("image/png");
}
