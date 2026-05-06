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

function getSequencePerfProfile() {
  if (typeof navigator === "undefined") {
    return { lowEnd: false, frameStep: 1, dprCap: 2, batchSizeOverride: null as number | null };
  }
  const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4;
  const deviceMemory = typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number"
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory!
    : 8;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const isSlowNetwork = connection?.effectiveType === "2g" || connection?.effectiveType === "3g";
  const lowEnd = Boolean(connection?.saveData) || isSlowNetwork || cores <= 6 || deviceMemory <= 6;
  if (!lowEnd) {
    return { lowEnd: false, frameStep: 1, dprCap: 2, batchSizeOverride: null as number | null };
  }
  const veryLowEnd = cores <= 4 || deviceMemory <= 4 || Boolean(connection?.saveData);
  if (veryLowEnd) {
    return { lowEnd: true, frameStep: 3, dprCap: 1, batchSizeOverride: 6 };
  }
  return { lowEnd: true, frameStep: 2, dprCap: 1, batchSizeOverride: 8 };
}

function getCanvasDpr(dprCap = 2): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : dprCap);
}

export default function ScrollSequence({ framePath, totalFrames, height, children, sequenceId, fit = "cover" }: ScrollSequenceProps) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const isVisibleRef = useRef(false);
  const progressRef = useRef(0);
  const drawRafRef = useRef(0);
  const lastDrawnFrameRef = useRef(-1);
  const canAnimateRef = useRef(true);
  const perfProfileRef = useRef(getSequencePerfProfile());

  const resolvedFramePath = useMemo(() => framePath.replace(/\/$/, ""), [framePath]);
  const posterFrameSrc = useMemo(() => `${resolvedFramePath}/frame-001.webp`, [resolvedFramePath]);

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
    const ctx = ctxRef.current ?? canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const dpr = getCanvasDpr(perfProfileRef.current.dprCap);
    const drawWidth = canvas.width / dpr;
    const drawHeight = canvas.height / dpr;
    if (drawWidth <= 0 || drawHeight <= 0) return;

    const rawIndex = clamp(
      Math.floor(progressRef.current * Math.max(totalFrames - 1, 0)),
      0,
      Math.max(totalFrames - 1, 0)
    );
    const frameStep = Math.max(1, perfProfileRef.current.frameStep);
    const targetIndex = Math.floor(rawIndex / frameStep) * frameStep;

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

  const updateProgress = useCallback(() => {
    const section = containerRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(section.scrollHeight - window.innerHeight, 1);
    progressRef.current = clamp(-rect.top / scrollable, 0, 1);
  }, []);

  const scheduleDraw = useCallback(() => {
    if (drawRafRef.current) return;
    drawRafRef.current = requestAnimationFrame(() => {
      drawRafRef.current = 0;
      if (!isVisibleRef.current || !canAnimateRef.current) return;
      updateProgress();
      drawFrame();
    });
  }, [drawFrame, updateProgress]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const updateCanAnimate = () => {
      canAnimateRef.current = !media.matches && !connection?.saveData && !document.hidden;
      if (canAnimateRef.current) scheduleDraw();
    };
    updateCanAnimate();
    const onVisibility = () => updateCanAnimate();
    media.addEventListener("change", updateCanAnimate);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      media.removeEventListener("change", updateCanAnimate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [scheduleDraw]);

  useEffect(() => {
    if (totalFrames <= 0) return;
    const images: HTMLImageElement[] = new Array(totalFrames);
    imagesRef.current = images;
    const batchSize = perfProfileRef.current.batchSizeOverride ?? getBatchSize();
    let cancelled = false;

    const loadBatch = (start: number, end: number) => {
      for (let i = start; i < end && i < totalFrames; i++) {
        const img = new Image();
        if (i < 10) img.setAttribute("fetchpriority", "high");
        img.decoding = "async";
        img.src = frameSrc(i);
        const idx = i;
        img.onload = () => {
          if (cancelled) return;
          images[idx] = img;
          if (idx === 0 || idx === lastDrawnFrameRef.current) scheduleDraw();
        };
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
  }, [frameSrc, scheduleDraw, totalFrames]);

  useEffect(() => {
    const section = containerRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) scheduleDraw();
      },
      { threshold: 0, rootMargin: "100px 0px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [scheduleDraw]);

  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = getCanvasDpr(perfProfileRef.current.dprCap);
      const width = window.innerWidth;
      const heightPx = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = heightPx * dpr;
      ctxRef.current = canvas.getContext("2d");
      if (ctxRef.current) ctxRef.current.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastDrawnFrameRef.current = -1;
      scheduleDraw();
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
  }, [scheduleDraw]);

  useEffect(() => {
    const onScroll = () => scheduleDraw();
    window.addEventListener("scroll", onScroll, { passive: true });
    scheduleDraw();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
      drawRafRef.current = 0;
    };
  }, [scheduleDraw]);

  return (
    <section
      ref={containerRef}
      id={sequenceId}
      className="relative bg-[#070d18]"
      style={{ height: `${height * 100}vh` }}
    >
      <div
        className="sticky top-0 h-screen w-full overflow-hidden bg-[#070d18] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${posterFrameSrc}")` }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full [contain:strict]" aria-hidden="true" />
        {children ? <div className="absolute inset-0 z-10">{children}</div> : null}
      </div>
    </section>
  );
}
