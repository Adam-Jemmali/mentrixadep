"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/core/utils";
import {
  RANK_ICON_ON_LIGHT_FILTER,
  RANK_ICON_VERSION,
} from "@/features/xp/rank-icon-contrast";

const ICON_VERSION = RANK_ICON_VERSION;

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
  minHeight?: number;
  height?: number;
  hudInset?: number;
  learnLabel?: string;
  teachLabel?: string;
  onPlayingChange?: (playing: boolean) => void;
  onHudUpdate?: (state: {
    secondsLeft: number;
    scores: { Mentrixer: number; Guide: number };
    phase: "idle" | "playing" | "done";
  }) => void;
  hideHud?: boolean;
  onComplete: (winner: SliceRole, scores: { Mentrixer: number; Guide: number }) => void;
  autoStart?: boolean;
  autoStartDelay?: number;
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
      className="pointer-events-none mx-rank-icon-on-light size-full select-none object-contain"
      style={{ filter: RANK_ICON_ON_LIGHT_FILTER }}
      aria-hidden
    />
  );
}

function randomLaneX(): number {
  return 12 + Math.random() * 76;
}

/**
 * Falling tap game — paper sticky chips + DOM transform RAF (no React re-render per frame).
 */
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
  const layerRef = useRef<HTMLDivElement>(null);
  const spawnIdRef = useRef(0);
  const finishingRef = useRef(false);
  const enteredPlayingRef = useRef(false);
  const iconsRef = useRef<FallingIcon[]>([]);
  const nodeMapRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const arenaHeightRef = useRef(fixedHeight ?? minHeight);
  const onCompleteRef = useRef(onComplete);
  const scoresRef = useRef({ Mentrixer: 0, Guide: 0 });
  const pendingCompleteRef = useRef<{
    winner: SliceRole;
    scores: { Mentrixer: number; Guide: number };
  } | null>(null);
  onCompleteRef.current = onComplete;

  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [secondsLeft, setSecondsLeft] = useState(gameSeconds);
  const [scores, setScores] = useState({ Mentrixer: 0, Guide: 0 });
  /** Render list identity only — positions live on DOM. */
  const [iconIds, setIconIds] = useState<number[]>([]);

  const measureArena = useCallback(() => {
    const el = arenaRef.current;
    if (!el) return;
    arenaHeightRef.current = fixedHeight ?? Math.max(el.clientHeight, minHeight);
  }, [fixedHeight, minHeight]);

  const startGame = useCallback(() => {
    finishingRef.current = false;
    enteredPlayingRef.current = true;
    pendingCompleteRef.current = null;
    spawnIdRef.current = 0;
    scoresRef.current = { Mentrixer: 0, Guide: 0 };
    setScores({ Mentrixer: 0, Guide: 0 });
    iconsRef.current = [];
    nodeMapRef.current.clear();
    setIconIds([]);
    setSecondsLeft(gameSeconds);
    setPhase("playing");
    onPlayingChange?.(true);
  }, [gameSeconds, onPlayingChange]);

  useEffect(() => {
    if (!autoStart && !viewportAutoStart) return;
    if (viewportAutoStart) {
      const el = arenaRef.current;
      if (!el) return;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            window.setTimeout(() => startGame(), autoStartDelay);
            io.disconnect();
          }
        },
        { threshold: viewportThreshold },
      );
      io.observe(el);
      return () => io.disconnect();
    }
    const t = window.setTimeout(() => startGame(), autoStartDelay);
    return () => window.clearTimeout(t);
  }, [autoStart, autoStartDelay, viewportAutoStart, viewportThreshold, startGame]);

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    measureArena();
    const ro = new ResizeObserver(measureArena);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureArena]);

  useEffect(() => {
    onHudUpdate?.({ secondsLeft, scores, phase });
  }, [secondsLeft, scores, phase, onHudUpdate]);

  const finishGame = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    iconsRef.current = [];
    setIconIds([]);
    setPhase("done");
    onPlayingChange?.(false);
    const current = scoresRef.current;
    const winner: SliceRole =
      current.Mentrixer > current.Guide
        ? "Mentrixer"
        : current.Guide > current.Mentrixer
          ? "Guide"
          : Math.random() < 0.5
            ? "Mentrixer"
            : "Guide";
    pendingCompleteRef.current = { winner, scores: { ...current } };
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
      if (iconsRef.current.length >= maxVisible) return;
      const role: SliceRole = Math.random() < 0.5 ? "Mentrixer" : "Guide";
      spawnIdRef.current += 1;
      const id = spawnIdRef.current;
      const icon: FallingIcon = {
        id,
        role,
        x: randomLaneX(),
        y: -iconSize - 6,
        vy: fallSpeed + Math.random() * 40,
      };
      iconsRef.current = [...iconsRef.current, icon];
      setIconIds((prev) => [...prev, id]);
    };
    spawn();
    const id = window.setInterval(spawn, spawnMs);
    return () => window.clearInterval(id);
  }, [phase, spawnMs, maxVisible, iconSize, fallSpeed]);

  /** Smooth fall: mutate transforms only — no React setState per frame. */
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.048);
      last = now;
      const h = arenaHeightRef.current;
      const next: FallingIcon[] = [];
      const removed: number[] = [];
      for (const icon of iconsRef.current) {
        if (icon.sliced) {
          next.push(icon);
          continue;
        }
        const y = icon.y + icon.vy * dt;
        if (y > h + iconSize) {
          removed.push(icon.id);
          continue;
        }
        const updated = { ...icon, y };
        next.push(updated);
        const node = nodeMapRef.current.get(icon.id);
        if (node) {
          node.style.transform = `translate3d(-50%, ${y}px, 0)`;
        }
      }
      iconsRef.current = next;
      if (removed.length) {
        for (const id of removed) nodeMapRef.current.delete(id);
        setIconIds((prev) => prev.filter((id) => !removed.includes(id)));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, iconSize]);

  const handleSlice = useCallback(
    (id: number) => {
      if (phase !== "playing") return;
      const icon = iconsRef.current.find((item) => item.id === id);
      if (!icon || icon.sliced) return;
      iconsRef.current = iconsRef.current.map((item) =>
        item.id === id ? { ...item, sliced: true } : item,
      );
      const node = nodeMapRef.current.get(id);
      if (node) node.classList.add("lp-falling-chip--sliced");
      const nextScores = {
        ...scoresRef.current,
        [icon.role]: scoresRef.current[icon.role] + 1,
      };
      scoresRef.current = nextScores;
      setScores(nextScores);
      window.setTimeout(() => {
        iconsRef.current = iconsRef.current.filter((item) => item.id !== id);
        nodeMapRef.current.delete(id);
        setIconIds((prev) => prev.filter((x) => x !== id));
      }, 140);
    },
    [phase],
  );

  const pad = iconSize + 18;
  const iconById = (id: number) => iconsRef.current.find((i) => i.id === id);

  return (
    <div
      ref={arenaRef}
      className={cn(
        "lp-paper-game-board relative w-full overflow-hidden rounded-xl border border-violet-300 bg-[#F8FAFC] touch-manipulation",
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
        ref={layerRef}
        className="absolute inset-x-0 bottom-0 z-[5]"
        style={{ top: hudInset }}
      >
        {phase === "playing"
          ? iconIds.map((id) => {
              const icon = iconById(id);
              if (!icon) return null;
              return (
                <button
                  key={id}
                  type="button"
                  ref={(el) => {
                    if (el) nodeMapRef.current.set(id, el);
                    else nodeMapRef.current.delete(id);
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleSlice(id);
                  }}
                  className="lp-falling-chip absolute z-40"
                  style={{
                    left: `${icon.x}%`,
                    top: 0,
                    width: pad,
                    height: pad,
                    transform: `translate3d(-50%, ${icon.y}px, 0)`,
                    willChange: "transform",
                  }}
                  aria-label={`Tap ${icon.role === "Mentrixer" ? learnLabel : teachLabel}`}
                >
                  <span
                    className={cn(
                      "flex size-full items-center justify-center rounded-lg border-2 border-[#4338CA] bg-white p-1 shadow-[1px_2px_0_rgba(11,18,32,0.16)]",
                      icon.role === "Guide" && "border-[var(--mx-primary-hover)]",
                    )}
                  >
                    <RoleImg role={icon.role} size={iconSize} />
                  </span>
                </button>
              );
            })
          : null}
      </div>

      {!hideHud ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex flex-col items-center bg-gradient-to-b from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent px-3 pb-5 pt-2.5 text-center">
          {phase === "playing" ? (
            <>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--mx-indigo)]">Tap the notes</p>
              <p className="text-xl font-black tabular-nums text-[var(--mx-navy)]">{secondsLeft}s</p>
              <div className="mt-1 flex gap-4 text-[11px] font-bold text-[#475569]">
                <span>
                  {learnLabel} <span className="text-[#4F46E5]">{scores.Mentrixer}</span>
                </span>
                <span>
                  {teachLabel} <span className="text-[var(--mx-violet)]">{scores.Guide}</span>
                </span>
              </div>
            </>
          ) : phase === "idle" ? (
            <button
              type="button"
              onClick={startGame}
              className="pointer-events-auto cursor-pointer rounded-lg border border-[var(--mx-indigo)] bg-violet-100 px-4 py-2 text-xs font-bold text-[#4F46E5] shadow-[2px_3px_0_rgba(11,18,32,0.1)]"
            >
              Start →
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
