"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { Feature, FeatureCollection } from "geojson";
import { cn } from "@/lib/utils";
import { GLOBE_LAND_GEOJSON } from "@/lib/globe-land-data";

const ICON_VERSION = "20260410";

export type GlobeMarkerRole = "mentrixer" | "guide";

export type GlobeMarker = {
  lng: number;
  lat: number;
  role: GlobeMarkerRole;
};

const DEFAULT_MARKERS: GlobeMarker[] = [
  { lng: -74.0, lat: 40.7, role: "mentrixer" },
  { lng: 2.35, lat: 48.85, role: "guide" },
  { lng: 139.69, lat: 35.68, role: "mentrixer" },
  { lng: -46.63, lat: -23.55, role: "guide" },
  { lng: 151.2, lat: -33.86, role: "guide" },
  { lng: 77.2, lat: 28.6, role: "mentrixer" },
];

export interface WireframeDottedGlobeProps {
  width?: number;
  height?: number;
  className?: string;
  markers?: GlobeMarker[];
  hideHint?: boolean;
}

function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const xi = pi[0]!;
    const yi = pi[1]!;
    const xj = pj[0]!;
    const yj = pj[1]!;

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInFeature(point: [number, number], feature: Feature): boolean {
  const geometry = feature.geometry;

  if (geometry.type === "Polygon") {
    const coordinates = geometry.coordinates;
    if (!pointInPolygon(point, coordinates[0]!)) return false;
    for (let i = 1; i < coordinates.length; i++) {
      if (pointInPolygon(point, coordinates[i]!)) return false;
    }
    return true;
  }

  if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      if (pointInPolygon(point, polygon[0]!)) {
        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
          if (pointInPolygon(point, polygon[i]!)) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
  }

  return false;
}

function generateDotsInPolygon(feature: Feature, dotSpacing = 22): [number, number][] {
  const dots: [number, number][] = [];
  const bounds = d3.geoBounds(feature);
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  const stepSize = dotSpacing * 0.08;

  for (let lng = minLng; lng <= maxLng; lng += stepSize) {
    for (let lat = minLat; lat <= maxLat; lat += stepSize) {
      const point: [number, number] = [lng, lat];
      if (pointInFeature(point, feature)) dots.push(point);
    }
  }

  return dots;
}

function loadIcon(role: GlobeMarkerRole): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src =
      role === "mentrixer"
        ? `/icons/mentrixer.svg?v=${ICON_VERSION}`
        : `/icons/guide.svg?v=${ICON_VERSION}`;
  });
}

export function WireframeDottedGlobe({
  width = 800,
  height = 600,
  className = "",
  markers = DEFAULT_MARKERS,
  hideHint = false,
}: WireframeDottedGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    let cancelled = false;

    const containerWidth = Math.min(width, typeof window !== "undefined" ? window.innerWidth - 40 : width);
    const containerHeight = Math.min(height, typeof window !== "undefined" ? window.innerHeight - 100 : height);
    const radius = Math.min(containerWidth, containerHeight) / 2.5;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    context.scale(dpr, dpr);

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90);

    const path = d3.geoPath().projection(projection).context(context);

    interface DotData {
      lng: number;
      lat: number;
    }

    const allDots: DotData[] = [];
    let landFeatures: FeatureCollection | null = null;
    const iconCache: Partial<Record<GlobeMarkerRole, HTMLImageElement>> = {};

    const rotation: [number, number] = [0, 0];
    let autoRotate = true;
    let visible = true;
    const rotationSpeed = 0.35;

    const isMarkerVisible = (lng: number, lat: number) => {
      const center: [number, number] = [-rotation[0], -rotation[1]];
      return d3.geoDistance([lng, lat], center) <= Math.PI / 2;
    };

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight);

      const currentScale = projection.scale();
      const scaleFactor = currentScale / radius;

      context.beginPath();
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI);
      context.fillStyle = "#07051a";
      context.fill();
      context.strokeStyle = "rgba(129, 140, 248, 0.45)";
      context.lineWidth = 2 * scaleFactor;
      context.stroke();

      if (landFeatures) {
        const graticule = d3.geoGraticule();
        context.beginPath();
        path(graticule());
        context.strokeStyle = "rgba(165, 180, 252, 0.22)";
        context.lineWidth = 1 * scaleFactor;
        context.stroke();

        context.beginPath();
        landFeatures.features.forEach((feature) => {
          path(feature);
        });
        context.strokeStyle = "rgba(199, 210, 254, 0.35)";
        context.lineWidth = 1 * scaleFactor;
        context.stroke();

        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat]);
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            context.beginPath();
            context.arc(projected[0], projected[1], 1.15 * scaleFactor, 0, 2 * Math.PI);
            context.fillStyle = "rgba(167, 139, 250, 0.85)";
            context.fill();
          }
        });

        markers.forEach((marker) => {
          if (!isMarkerVisible(marker.lng, marker.lat)) return;
          const projected = projection([marker.lng, marker.lat]);
          const img = iconCache[marker.role];
          if (!projected || !img) return;

          const size = 18 * scaleFactor;
          context.save();
          context.shadowColor = marker.role === "mentrixer" ? "rgba(167,139,250,0.7)" : "rgba(96,165,250,0.7)";
          context.shadowBlur = 8 * scaleFactor;
          context.drawImage(img, projected[0] - size / 2, projected[1] - size / 2, size, size);
          context.restore();
        });
      }
    };

    const loadWorldData = async () => {
      try {
        setIsLoading(true);

        if (!GLOBE_LAND_GEOJSON?.features?.length) {
          throw new Error("Bundled land map data is missing or invalid");
        }

        landFeatures = GLOBE_LAND_GEOJSON;

        const [mentrixerIcon, guideIcon] = await Promise.all([
          loadIcon("mentrixer"),
          loadIcon("guide"),
        ]);

        if (cancelled) return;

        if (mentrixerIcon) iconCache.mentrixer = mentrixerIcon;
        if (guideIcon) iconCache.guide = guideIcon;

        for (const feature of landFeatures.features) {
          if (!feature.geometry) continue;
          generateDotsInPolygon(feature, 26).forEach(([lng, lat]) => {
            allDots.push({ lng, lat });
          });
        }

        render();
        setIsLoading(false);
      } catch {
        if (!cancelled) {
          setError("Failed to load land map data");
          setIsLoading(false);
        }
      }
    };

    const rotate = () => {
      if (autoRotate && visible) {
        rotation[0] += rotationSpeed;
        projection.rotate(rotation);
        render();
      }
    };

    const rotationTimer = d3.timer(rotate);

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
      },
      { rootMargin: "80px", threshold: 0.05 },
    );
    visibilityObserver.observe(canvas);

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false;
      const startX = event.clientX;
      const startY = event.clientY;
      const startRotation: [number, number] = [rotation[0], rotation[1]];

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.5;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        rotation[0] = startRotation[0] + dx * sensitivity;
        rotation[1] = startRotation[1] - dy * sensitivity;
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]));

        projection.rotate(rotation);
        render();
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        window.setTimeout(() => {
          autoRotate = true;
        }, 10);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * scaleFactor));
      projection.scale(newRadius);
      render();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    void loadWorldData();

    return () => {
      cancelled = true;
      rotationTimer.stop();
      visibilityObserver.disconnect();
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [width, height, markers]);

  if (error) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl bg-card p-8", className)}>
        <div className="text-center">
          <p className="mb-2 font-semibold text-destructive">Error loading Earth visualization</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        className="h-auto w-full rounded-2xl"
        style={{ maxWidth: "100%", height: "auto" }}
        aria-label="Interactive dotted globe. Drag to rotate, scroll to zoom."
      />
      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/40">
          <span className="text-xs font-medium uppercase tracking-widest text-indigo-300/80">Loading globe…</span>
        </div>
      ) : null}
      {!hideHint ? (
        <div className="absolute bottom-3 left-3 rounded-md bg-slate-950/80 px-2 py-1 text-[10px] text-slate-400 backdrop-blur-sm">
          Drag to rotate · Scroll to zoom
        </div>
      ) : null}
    </div>
  );
}

export default WireframeDottedGlobe;
