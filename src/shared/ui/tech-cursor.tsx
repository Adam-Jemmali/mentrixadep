"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { motion, MotionConfig } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { useLowEndMode } from "@/features/marketing/landing-perf";

const LOGO_SIZE = 36;
const MAX_PARTICLES = 64;
const PARTICLE_SPAWN_MS = 48;
const HTML_CURSOR_CLASS = "lp-landing-logo-cursor-active";

interface Particle {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

function canUseCustomCursor() {
  return (
    window.matchMedia("(hover: hover)").matches ||
    window.matchMedia("(any-hover: hover)").matches
  );
}

type Props = {
  children?: ReactNode;
  className?: string;
};

/** Mentrixa logo follower + floating logo particle trail (single RAF, no per-frame React updates). */
export function MentrixaCursor({ children, className }: Props) {
  const lowEnd = useLowEndMode();
  const [active, setActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const targetRef = useRef({ x: -120, y: -120 });
  const posRef = useRef({ x: -120, y: -120 });
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const visibleRef = useRef(false);

  const trailEnabled = active && !lowEnd;

  useEffect(() => {
    setActive(canUseCustomCursor());
  }, []);

  useEffect(() => {
    if (!active) return;

    document.documentElement.classList.add(HTML_CURSOR_CLASS);
    return () => {
      document.documentElement.classList.remove(HTML_CURSOR_CLASS);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const follower = followerRef.current;
    if (!follower) return;

    const canvas = canvasRef.current;
    let ctx: CanvasRenderingContext2D | null = null;
    let dpr = 1;
    let disposed = false;

    const img = new window.Image();
    img.src = MENTRIXA_LOGO_PNG;
    void img.decode?.().catch(() => undefined);

    const particles = particlesRef.current;

    const resize = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx = canvas.getContext("2d", { alpha: true });
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const tick = () => {
      if (disposed) return;

      const t = targetRef.current;
      const p = posRef.current;
      p.x += (t.x - p.x) * 0.28;
      p.y += (t.y - p.y) * 0.28;
      follower.style.transform = `translate3d(${Math.round(p.x - LOGO_SIZE / 2)}px, ${Math.round(p.y - LOGO_SIZE / 2)}px, 0)`;

      if (trailEnabled && ctx && logoImageRef.current && !document.hidden) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        for (let i = particles.length - 1; i >= 0; i--) {
          const particle = particles[i]!;
          particle.y -= 0.4;
          particle.alpha -= 0.022;
          if (particle.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = particle.alpha;
          ctx.drawImage(
            logoImageRef.current,
            particle.x - particle.size / 2,
            particle.y - particle.size / 2,
            particle.size,
            particle.size,
          );
        }
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      targetRef.current = { x: event.clientX, y: event.clientY };

      if (!visibleRef.current) {
        visibleRef.current = true;
        follower.style.opacity = "1";
      }

      if (!trailEnabled || !logoImageRef.current) return;

      const now = performance.now();
      if (now - lastSpawnRef.current < PARTICLE_SPAWN_MS) return;
      lastSpawnRef.current = now;

      if (particles.length >= MAX_PARTICLES) particles.shift();
      particles.push({
        x: event.clientX,
        y: event.clientY,
        alpha: 1,
        size: 20 + Math.random() * 6,
      });
    };

    const onLeave = () => {
      visibleRef.current = false;
      follower.style.opacity = "0";
    };

    const start = () => {
      if (disposed) return;
      logoImageRef.current = img;
      if (trailEnabled && canvas) resize();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    if (img.complete) start();
    else img.onload = start;

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      particles.length = 0;
    };
  }, [active, trailEnabled, lowEnd]);

  return (
    <>
      {active ? (
        <canvas
          ref={canvasRef}
          aria-hidden
          className={cn(
            "pointer-events-none fixed inset-0 z-[9998] h-full w-full",
            !trailEnabled && "hidden",
          )}
        />
      ) : null}

      {active ? (
        <div
          ref={followerRef}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[10000] will-change-transform"
          style={{ opacity: 0, transition: "opacity 0.15s ease" }}
        >
          <MotionConfig reducedMotion="never">
            <motion.div
              animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
              style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
            >
              <NextImage
                src={MENTRIXA_LOGO_PNG}
                alt=""
                width={LOGO_SIZE}
                height={LOGO_SIZE}
                priority
                className="size-full object-contain drop-shadow-[0_0_18px_rgba(99,102,241,0.6)]"
                draggable={false}
                sizes={`${LOGO_SIZE}px`}
              />
            </motion.div>
          </MotionConfig>
        </div>
      ) : null}

      {children ? <div className={cn(className)}>{children}</div> : null}
    </>
  );
}

/** @deprecated Use MentrixaCursor — kept for import compatibility. */
export function TechCursor() {
  return <MentrixaCursor />;
}

export default MentrixaCursor;
