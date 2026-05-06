"use client";

import { GripVertical } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type Props = {
  titleId: string;
  children: ReactNode;
  className?: string;
};

const MAX_DRAG_PX = 220;

export function FirstLoginTourPanel({ titleId, children, className }: Props) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const clampOffset = useCallback((x: number, y: number) => {
    return {
      x: Math.max(-MAX_DRAG_PX, Math.min(MAX_DRAG_PX, x)),
      y: Math.max(-MAX_DRAG_PX, Math.min(MAX_DRAG_PX, y)),
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const nx = d.origX + (e.clientX - d.startX);
    const ny = d.origY + (e.clientY - d.startY);
    setOffset(clampOffset(nx, ny));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
  };

  useEffect(() => {
    const onResize = () => setOffset((o) => clampOffset(o.x, o.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampOffset]);

  return (
    <div className="fixed inset-0 z-[35] pointer-events-none">
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        className={cn(
          "pointer-events-auto fixed bottom-4 left-4 right-4 mx-auto flex max-h-[min(58vh,340px)] flex-col sm:left-auto sm:right-4 sm:mx-0",
          "w-full max-w-[min(100%-2rem,268px)] sm:max-w-[268px]",
          "rounded-xl border border-slate-700 bg-slate-950/98 backdrop-blur-md shadow-xl shadow-black/45",
          "text-slate-100",
          className,
        )}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
        }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none items-center justify-center gap-1 rounded-t-xl border-b border-slate-700 bg-slate-900/95 py-1 text-slate-300 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="toolbar"
          aria-label="Move tour card"
        >
          <GripVertical className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Drag</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-950/98 p-3">
          {children}
        </div>
      </div>
    </div>
  );
}
