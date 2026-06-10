"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/core/utils";

const ICON_VERSION = "20260410";

export type SliceRole = "Mentrixer" | "Guide";

type FallingIcon = {
  id: number;
  role: SliceRole;
  x: number;
  y: number;
  vy: number;
  sliced?: boolean;
};

export type FallingSliceArenaProps = {
  gameSeconds?: number;
  spawnMs?: number;
  maxVisible?: number;
  iconSize?: number;
  fallSpeed?: number;
  /** Minimum height when no fixed `height` is set. */
  minHeight?: number;
  /** Fixed arena height (px). Use in compact cards so physics match the visible box. */
  height?: number;
  /** Top strip reserved for HUD; icons spawn and fall in the area below. */
  hudInset?: number;
  learnLabel?: string;
  teachLabel?: string;
  onPlayingChange?: (playing: boolean) => void;
  /** Live score + timer for custom HUD overlays */
  onHudUpdate?: (state: {
    secondsLeft: number;
    scores: { Mentrixer: number; Guide: number };
    phase: "idle" | "playing" | "done";
  }) => void;
  /** Hide built-in HUD (use with onHudUpdate + custom overlay) */
  hideHud?: boolean;
  onComplete: (winner: SliceRole, scores: { Mentrixer: number; Guide: number }) => void;
  autoStart?: boolean;
  /** Ms before auto-start (0 = immediate). */
  autoStartDelay?: number;
  /** Start when the arena scrolls into view (uses autoStartDelay). */
  viewportAutoStart?: boolean;
  viewportThreshold?: number;
  className?: string;
};

function RoleImg({ role, size }: { role: SliceRole; size: number }) {
  const src = role === "Mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className="pointer-events-none size-full select-none object-contain"
      aria-hidden
    />
  );
}

function randomLaneX(): number {
  return 10 + Math.random() * 80;
}

export function FallingRoleSliceArena({
  gameSeconds = 10,
  spawnMs = 360,
  maxVisible = 12,
  iconSize = 44,
  fallSpeed = 200,
  minHeight = 200,
  height: fixedHeight,
  hudInset = 0,
  learnLabel = "Learn",
  teachLabel = "Teach",
  onPlayingChange,
  onHudUpdate,
  hideHud = false,
  onComplete,
  autoStart = true,
  autoStartDelay = 350,
  viewportAutoStart = false,
  viewportThreshold = 0.2,
  className,
}: FallingSliceArenaProps) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const spawnIdRef = useRef(0);
  const finishingRef = useRef(false);
  const enteredPlayingRef = useRef(false);
  const iconsRef = useRef<FallingIcon[]>([]);
  const arenaHeightRef = useRef(fixedHeight ?? minHeight);
  const onCompleteRef = useRef(onComplete);
  const pendingCompleteRef = useRef<{
    winner: SliceRole;
    scores: { Mentrixer: number; Guide: number };
  } | null>(null);
  onCompleteRef.current = onComplete;

  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [secondsLeft, setSecondsLeft] = useState(gameSeconds);
  const [scores, setScores] = useState({ Mentrixer: 0, Guide: 0 });
  const [icons, setIcons] = useState<FallingIcon[]>([]);

  const startGame = useCallback(() => {
    finishingRef.current = false;
    enteredPlayingRef.current = true;
    pendingCompleteRef.current = null;
    spawnIdRef.current = 0;
    setScores({ Mentrixer: 0, Guide: 0 });
    setIcons([]);
    iconsRef.current = [];
    setSecondsLeft(gameSeconds);
    setPhase("playing");
    onPlayingChange?.(true);
  }, [gameSeconds, onPlayingChange]);

  useEffect(() => {
    if (!autoStart || viewportAutoStart) return;
    if (phase !== "idle") return;
    if (autoStartDelay <= 0) {
      startGame();
      return;
    }
    const id = window.setTimeout(startGame, autoStartDelay);
    return () => window.clearTimeout(id);
  }, [autoStart, autoStartDelay, phase, startGame, viewportAutoStart]);

  useEffect(() => {
    if (!viewportAutoStart) return;
    const el = arenaRef.current;
    if (!el) return;

    let delayId: number | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (phase !== "idle") return;
        if (delayId != null) return;
        delayId = window.setTimeout(() => {
          delayId = null;
          startGame();
        }, autoStartDelay);
      },
      { threshold: viewportThreshold, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (delayId != null) window.clearTimeout(delayId);
    };
  }, [viewportAutoStart, viewportThreshold, autoStartDelay, phase, startGame]);

  const measureArena = useCallback(() => {
    const el = arenaRef.current;
    if (!el) return;
    const h = el.clientHeight;
    const playH = hudInset > 0 ? Math.max(h - hudInset, 100) : h;
    if (playH > 0) arenaHeightRef.current = playH;
  }, [hudInset]);

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    measureArena();
    const ro = new ResizeObserver(measureArena);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureArena, fixedHeight, minHeight]);

  useEffect(() => {
    if (phase !== "playing") return;
    measureArena();
    const id = requestAnimationFrame(measureArena);
    return () => cancelAnimationFrame(id);
  }, [phase, measureArena]);

  useEffect(() => {
    onHudUpdate?.({ secondsLeft, scores, phase });
  }, [secondsLeft, scores, phase, onHudUpdate]);

  const finishGame = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIcons([]);
    iconsRef.current = [];
    setPhase("done");
    onPlayingChange?.(false);
    setScores((current) => {
      const winner: SliceRole =
        current.Mentrixer > current.Guide
          ? "Mentrixer"
          : current.Guide > current.Mentrixer
            ? "Guide"
            : Math.random() < 0.5
              ? "Mentrixer"
              : "Guide";
      pendingCompleteRef.current = { winner, scores: current };
      return current;
    });
  }, [onPlayingChange]);

  useEffect(() => {
    if (phase !== "done") return;
    if (!enteredPlayingRef.current) return;
    const pending = pendingCompleteRef.current;
    if (!pending) return;
    pendingCompleteRef.current = null;
    enteredPlayingRef.current = false;
    onCompleteRef.current(pending.winner, pending.scores);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const tick = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [phase, finishGame]);

  useEffect(() => {
    if (phase !== "playing") return;
    const spawn = () => {
      setIcons((prev) => {
        if (prev.length >= maxVisible) return prev;
        const role: SliceRole = Math.random() < 0.5 ? "Mentrixer" : "Guide";
        spawnIdRef.current += 1;
        const next = [
          ...prev,
          {
            id: spawnIdRef.current,
            role,
            x: randomLaneX(),
            y: -iconSize - 6,
            vy: fallSpeed + Math.random() * 50,
          },
        ];
        iconsRef.current = next;
        return next;
      });
    };
    spawn();
    const id = window.setInterval(spawn, spawnMs);
    return () => window.clearInterval(id);
  }, [phase, spawnMs, maxVisible, iconSize, fallSpeed]);

  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const h = arenaHeightRef.current;
      setIcons((prev) => {
        const next: FallingIcon[] = [];
        for (const icon of prev) {
          if (icon.sliced) {
            next.push(icon);
            continue;
          }
          const y = icon.y + icon.vy * dt;
          if (y > h + iconSize) continue;
          next.push({ ...icon, y });
        }
        iconsRef.current = next;
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, iconSize]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      setIcons((prev) => {
        const next = prev.filter((icon) => !icon.sliced);
        iconsRef.current = next;
        return next;
      });
    }, 260);
    return () => window.clearInterval(id);
  }, [phase]);

  const handleSlice = useCallback(
    (id: number) => {
      if (phase !== "playing") return;
      const icon = iconsRef.current.find((item) => item.id === id);
      if (!icon || icon.sliced) return;
      setIcons((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, sliced: true } : item));
        iconsRef.current = next;
        return next;
      });
      setScores((prev) => ({ ...prev, [icon.role]: prev[icon.role] + 1 }));
      window.setTimeout(() => {
        setIcons((prev) => {
          const next = prev.filter((item) => item.id !== id);
          iconsRef.current = next;
          return next;
        });
      }, 180);
    },
    [phase],
  );

  const pad = iconSize + 20;

  return (
    <div
      ref={arenaRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-white/15 bg-black/50 touch-manipulation",
        phase === "playing" && "cursor-crosshair",
        className,
      )}
      style={
        fixedHeight != null
          ? { height: fixedHeight, minHeight: fixedHeight }
          : { minHeight }
      }
    >
      <div
        className="absolute inset-x-0 bottom-0 z-[5]"
        style={{ top: hudInset }}
      >
        {phase === "playing"
          ? icons.map((icon) => (
              <button
                key={icon.id}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleSlice(icon.id);
                }}
                className="absolute z-40"
                style={{
                  left: `${icon.x}%`,
                  top: 0,
                  width: pad,
                  height: pad,
                  transform: `translate3d(-50%, ${icon.y}px, 0)`,
                  willChange: "transform",
                }}
                aria-label={`Slice ${icon.role === "Mentrixer" ? learnLabel : teachLabel}`}
              >
                <span
                  className={cn(
                    "flex size-full items-center justify-center rounded-xl border-2 p-1.5 shadow-lg transition-transform duration-75",
                    icon.sliced ? "scale-150 border-white/90 opacity-0" : "scale-100 opacity-100",
                    icon.role === "Mentrixer"
                      ? "border-indigo-300/80 bg-indigo-950/95 shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                      : "border-violet-300/80 bg-violet-950/95 shadow-[0_0_20px_rgba(139,92,246,0.5)]",
                  )}
                >
                  <RoleImg role={icon.role} size={iconSize} />
                </span>
              </button>
            ))
          : null}
      </div>

      {!hideHud ? (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex flex-col items-center bg-gradient-to-b from-black/90 via-black/60 to-transparent px-3 pb-6 pt-3 text-center">
        {phase === "playing" ? (
          <>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">Tap the icons</p>
            <p className="text-2xl font-black tabular-nums text-white">{secondsLeft}s</p>
            <div className="mt-1.5 flex gap-4 text-[11px] font-bold">
              <span className="text-indigo-200">
                {learnLabel} <span className="text-white">{scores.Mentrixer}</span>
              </span>
              <span className="text-violet-200">
                {teachLabel} <span className="text-white">{scores.Guide}</span>
              </span>
            </div>
          </>
        ) : phase === "idle" ? (
          <button
            type="button"
            onClick={startGame}
            className="pointer-events-auto cursor-pointer rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-bold text-white hover:bg-white/25"
          >
            Start slicing →
          </button>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
