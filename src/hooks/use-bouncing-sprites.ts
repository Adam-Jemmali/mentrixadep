"use client";

import { useLayoutEffect, type RefObject } from "react";

type Particle = {
  el: HTMLDivElement;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

const MIN_BOX = 48;

function randomVelocity(): number {
  const speed = 95 + Math.random() * 110;
  return (Math.random() > 0.5 ? 1 : -1) * speed;
}

function randomNudge(): number {
  return (Math.random() - 0.5) * 28;
}

function normalizeSpeed(p: Particle) {
  const speed = Math.hypot(p.vx, p.vy) || 1;
  const minSpeed = 100;
  const maxSpeed = 200;
  const target = Math.max(minSpeed, Math.min(maxSpeed, speed));
  const scale = target / speed;
  p.vx *= scale;
  p.vy *= scale;
}

function applyTransform(p: Particle) {
  p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
}

/**
 * DVD-screensaver motion inside `containerRef`. Sprite nodes must be `absolute left-0 top-0`.
 */
export function useBouncingSprites(
  containerRef: RefObject<HTMLElement | null>,
  itemRefs: RefObject<(HTMLDivElement | null)[]>,
  sizes: readonly number[],
  disabled: boolean,
) {
  useLayoutEffect(() => {
    if (disabled) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const elements = (itemRefs.current ?? []).filter(Boolean) as HTMLDivElement[];
    if (elements.length === 0) return;

    const particles: Particle[] = elements.map((el, i) => ({
      el,
      size: sizes[i] ?? 44,
      x: 0,
      y: 0,
      vx: randomVelocity(),
      vy: randomVelocity(),
    }));

    let frameId = 0;
    let lastTs = 0;
    let running = false;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let ro: ResizeObserver | null = null;

    const bounds = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      return { width, height, ready: width >= MIN_BOX && height >= MIN_BOX };
    };

    const seedPositions = (randomize: boolean) => {
      const { width, height, ready } = bounds();
      if (!ready) return false;

      for (const p of particles) {
        const maxX = Math.max(width - p.size, 0);
        const maxY = Math.max(height - p.size, 0);
        if (randomize) {
          p.x = Math.random() * maxX;
          p.y = Math.random() * maxY;
          normalizeSpeed(p);
        } else {
          p.x = Math.min(Math.max(p.x, 0), maxX);
          p.y = Math.min(Math.max(p.y, 0), maxY);
        }
        applyTransform(p);
      }
      return true;
    };

    const step = (ts: number) => {
      if (!running) return;
      frameId = window.requestAnimationFrame(step);

      if (document.hidden) return;

      if (lastTs === 0) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const { width, height, ready } = bounds();
      if (!ready) return;

      for (const p of particles) {
        const maxX = Math.max(width - p.size, 0);
        const maxY = Math.max(height - p.size, 0);

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x <= 0) {
          p.x = 0;
          p.vx = Math.abs(p.vx);
          p.vy += randomNudge();
        } else if (p.x >= maxX) {
          p.x = maxX;
          p.vx = -Math.abs(p.vx);
          p.vy += randomNudge();
        }

        if (p.y <= 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy);
          p.vx += randomNudge();
        } else if (p.y >= maxY) {
          p.y = maxY;
          p.vy = -Math.abs(p.vy);
          p.vx += randomNudge();
        }

        normalizeSpeed(p);
        applyTransform(p);
      }
    };

    const startLoop = () => {
      if (running) return;
      if (!seedPositions(true)) return;
      running = true;
      lastTs = 0;
      frameId = window.requestAnimationFrame(step);
    };

    const tryStart = () => {
      if (seedPositions(true)) startLoop();
    };

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!running) {
          tryStart();
          return;
        }
        seedPositions(false);
      }, 120);
    };

    tryStart();
    if (!running) {
      let attempts = 0;
      const waitForLayout = () => {
        if (!running && attempts < 120) {
          attempts += 1;
          tryStart();
          if (!running) frameId = window.requestAnimationFrame(waitForLayout);
        }
      };
      frameId = window.requestAnimationFrame(waitForLayout);
    }

    window.addEventListener("resize", onResize, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(container);
    }

    return () => {
      running = false;
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.cancelAnimationFrame(frameId);
      ro?.disconnect();
    };
  }, [disabled, containerRef, itemRefs, sizes]);
}
