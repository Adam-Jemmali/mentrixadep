"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";

type ScrollSequenceProps = {
  framePath: string;
  totalFrames: number;
  height: number;
  children?: ReactNode;
  sequenceId?: string;
  fit?: "cover" | "contain";
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getBatchSize(): number {
  if (typeof navigator === "undefined") return 20;
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  if (!connection?.effectiveType) return 20;
  if (connection.effectiveType === "4g") return 30;
  if (connection.effectiveType === "3g") return 12;
  return 6;
}

function getCanvasDpr(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
}

export default function ScrollSequence({ framePath, totalFrames, height, children, sequenceId, fit = "cover" }: ScrollSequenceProps) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const isVisibleRef = useRef(false);
  const progressRef = useRef(0);
  const rafRef = useRef(0);
  const lastDrawnFrameRef = useRef(-1);

  const resolvedFramePath = useMemo(() => framePath.replace(/\/$/, ""), [framePath]);

  const frameSrc = useCallback(
    (index: number) => {
      const frameNumber = String(index + 1).padStart(3, "0");
      return `${resolvedFramePath}/frame-${frameNumber}.webp`;
    },
    [resolvedFramePath]
  );

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = getCanvasDpr();
    const drawWidth = canvas.width / dpr;
    const drawHeight = canvas.height / dpr;
    if (drawWidth <= 0 || drawHeight <= 0) return;

    const targetIndex = clamp(
      Math.floor(progressRef.current * Math.max(totalFrames - 1, 0)),
      0,
      Math.max(totalFrames - 1, 0)
    );

    if (targetIndex === lastDrawnFrameRef.current) return;

    let image = imagesRef.current[targetIndex];
    if (!image || !image.complete || image.naturalWidth === 0) {
      for (let i = targetIndex - 1; i >= 0; i--) {
        const fallback = imagesRef.current[i];
        if (fallback && fallback.complete && fallback.naturalWidth > 0) {
          image = fallback;
          break;
        }
      }
    }

    if (!image || !image.complete || image.naturalWidth === 0) return;

    ctx.clearRect(0, 0, drawWidth, drawHeight);
    const scale = fit === "contain"
      ? Math.min(drawWidth / image.naturalWidth, drawHeight / image.naturalHeight)
      : Math.max(drawWidth / image.naturalWidth, drawHeight / image.naturalHeight);
    const sw = image.naturalWidth * scale;
    const sh = image.naturalHeight * scale;
    ctx.drawImage(image, (drawWidth - sw) / 2, (drawHeight - sh) / 2, sw, sh);
    lastDrawnFrameRef.current = targetIndex;
  }, [fit, totalFrames]);

  useEffect(() => {
    if (totalFrames <= 0) return;
    const images: HTMLImageElement[] = new Array(totalFrames);
    imagesRef.current = images;
    const batchSize = getBatchSize();
    let cancelled = false;

    const loadBatch = (start: number, end: number) => {
      for (let i = start; i < end && i < totalFrames; i++) {
        const img = new Image();
        if (i < 10) img.setAttribute("fetchpriority", "high");
        img.decoding = "async";
        img.src = frameSrc(i);
        const idx = i;
        img.onload = () => { if (!cancelled) images[idx] = img; };
        img.onerror = () => { if (!cancelled) images[idx] = img; };
      }
    };

    loadBatch(0, batchSize);
    let batch = 1;
    const schedule =
      typeof requestIdleCallback !== "undefined"
        ? (cb: () => void) => requestIdleCallback(cb, { timeout: 120 })
        : (cb: () => void) => setTimeout(cb, 24);

    const loadRemaining = () => {
      if (cancelled) return;
      const start = batch * batchSize;
      if (start >= totalFrames) return;
      const end = Math.min(start + batchSize, totalFrames);
      schedule(() => {
        if (cancelled) return;
        loadBatch(start, end);
        batch += 1;
        loadRemaining();
      });
    };

    loadRemaining();
    return () => { cancelled = true; };
  }, [frameSrc, totalFrames]);

  useEffect(() => {
    const section = containerRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0, rootMargin: "100px 0px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = getCanvasDpr();
      const width = window.innerWidth;
      const heightPx = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = heightPx * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastDrawnFrameRef.current = -1;
      drawFrame();
    };

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateCanvasSize, 120);
    };

    updateCanvasSize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
  }, [drawFrame]);

  useEffect(() => {
    const tick = () => {
      const section = containerRef.current;
      if (section) {
        const rect = section.getBoundingClientRect();
        const scrollable = Math.max(section.scrollHeight - window.innerHeight, 1);
        progressRef.current = clamp(-rect.top / scrollable, 0, 1);
      }
      if (isVisibleRef.current) drawFrame();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawFrame]);

  return (
    <section ref={containerRef} id={sequenceId} className="relative" style={{ height: `${height * 100}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
        {children ? <div className="absolute inset-0 z-10">{children}</div> : null}
      </div>
    </section>
  );
}
