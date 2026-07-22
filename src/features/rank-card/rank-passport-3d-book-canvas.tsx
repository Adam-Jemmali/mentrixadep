"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import {
  PassportCoverFace,
  PassportPageChrome,
  PASSPORT_CAMERA_FOV,
  PASSPORT_CAMERA_Z,
  PASSPORT_PAGE_H_UNITS,
  PASSPORT_PAGE_W_UNITS,
  passportHtmlDistanceFactor,
  passportPageStamp,
} from "@/features/rank-card/rank-passport-3d-decor";
import {
  PassportCoverMaterial,
  PassportPaperMaterial,
} from "@/features/rank-card/rank-passport-3d-materials";
import { cn } from "@/shared/core/utils";

const PAGE_W = PASSPORT_PAGE_W_UNITS;
const PAGE_H = PASSPORT_PAGE_H_UNITS;
const PAGE_HALF = PAGE_W / 2;
const PAGE_THICK = 0.012;
const COVER_THICK = 0.032;
/** Pages overlap slightly at the spine like bound paper. */
const SPINE_OVERLAP = 0.06;
const LEFT_PAGE_X = -(PAGE_HALF - SPINE_OVERLAP / 2);
const RIGHT_PAGE_X = PAGE_HALF - SPINE_OVERLAP / 2;
const OPEN_COVER_ANGLE = -Math.PI * 0.88;
const FLIP_DURATION = 0.88;
const HTML_DISTANCE_FACTOR = passportHtmlDistanceFactor();

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export type PassportNavState = {
  spread: number;
  totalSpreads: number;
  coverOpen: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  goPrev: () => void;
  goNext: () => void;
  openCover: () => void;
};

export type PassportBookCanvasProps = {
  pages: ReactNode[];
  subjectLabel: string;
  onSpreadChange?: (spread: number) => void;
  onNavChange?: (nav: PassportNavState) => void;
};

function spreadCount(pageCount: number) {
  return Math.max(1, Math.ceil(pageCount / 2));
}

function pageAt(pages: ReactNode[], index: number) {
  if (index >= pages.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
        End
      </div>
    );
  }
  return pages[index];
}

function PageSpineEdge({ side }: { side: "left" | "right" }) {
  return (
    <mesh position={[side === "left" ? PAGE_HALF - 0.001 : -PAGE_HALF + 0.001, 0, 0]}>
      <boxGeometry args={[0.003, PAGE_H * 0.98, PAGE_THICK * 1.2]} />
      <meshStandardMaterial color="#E8E2D4" roughness={0.95} />
    </mesh>
  );
}

function PagePaperMesh({ side }: { side: "left" | "right" }) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[PAGE_W, PAGE_H, PAGE_THICK]} />
        <PassportPaperMaterial />
      </mesh>
      <PageSpineEdge side={side} />
    </group>
  );
}

function PageSlot({
  position,
  side,
  pageIndex,
  onClick,
  children,
}: {
  position: [number, number, number];
  side: "left" | "right";
  pageIndex: number;
  onClick?: (event: { stopPropagation: () => void }) => void;
  children: ReactNode;
}) {
  const stamp = passportPageStamp(pageIndex);

  return (
    <group position={position}>
      <mesh onClick={onClick}>
        <boxGeometry args={[PAGE_W, PAGE_H, PAGE_THICK]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <PageSpineEdge side={side} />
      <Html
        transform
        occlude={false}
        distanceFactor={HTML_DISTANCE_FACTOR}
        position={[0, 0, PAGE_THICK / 2 + 0.003]}
        zIndexRange={[40, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "none" }}>
          <PassportPageChrome side={side} stamp={stamp}>
            {children}
          </PassportPageChrome>
        </div>
      </Html>
    </group>
  );
}

function PageTurnEdge() {
  return (
    <mesh>
      <boxGeometry args={[PAGE_THICK, PAGE_H * 0.98, 0.004]} />
      <PassportPaperMaterial color="#E8E2D4" />
    </mesh>
  );
}

function ClosedPageEdges({ layers }: { layers: number }) {
  const count = Math.min(layers, 16);
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <mesh
          key={index}
          position={[PAGE_W * 0.5 + index * PAGE_THICK * 0.92, -0.01 + index * 0.002, index * PAGE_THICK * 0.38]}
          castShadow
        >
          <boxGeometry args={[PAGE_THICK, PAGE_H * 0.96, PAGE_H * 0.64]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#EDE8DC" : "#E2DDD0"}
            roughness={0.9}
          />
        </mesh>
      ))}
    </>
  );
}

function PassportSpineCrease({ z }: { z: number }) {
  return (
    <mesh position={[0, 0, z]}>
      <boxGeometry args={[0.004, PAGE_H, PAGE_THICK * 0.8]} />
      <meshStandardMaterial color="#DDD6C6" roughness={1} />
    </mesh>
  );
}

function PassportBookScene({
  pages,
  subjectLabel,
  onSpreadChange,
  onNavChange,
}: PassportBookCanvasProps) {
  const floatRef = useRef<THREE.Group>(null);
  const entranceRef = useRef(0);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverReady, setCoverReady] = useState(false);
  const [spread, setSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipBackward, setFlipBackward] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const coverPivotRef = useRef<THREE.Group>(null);
  const flipPivotRef = useRef<THREE.Group>(null);
  const coverAngle = useRef(0);
  const flipAngle = useRef(0);
  const flipProgress = useRef(0);
  const targetCover = useRef(0);
  const coverDoneRef = useRef(false);
  const animatingRef = useRef(false);

  const totalSpreads = spreadCount(pages.length);
  const leftIndex = spread * 2;
  const rightIndex = spread * 2 + 1;

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const closeCover = useCallback(() => {
    if (!coverOpen || animatingRef.current) return;
    setCoverReady(false);
    setCoverOpen(false);
    coverDoneRef.current = false;
    targetCover.current = 0;
    animatingRef.current = true;
  }, [coverOpen]);

  const openCover = useCallback(() => {
    if (coverOpen || animatingRef.current) return;
    setCoverOpen(true);
    targetCover.current = OPEN_COVER_ANGLE;
    animatingRef.current = true;
  }, [coverOpen]);

  const finishForwardFlip = useCallback(() => {
    setIsFlipping(false);
    setFlipBackward(false);
    animatingRef.current = false;
    flipProgress.current = 0;
    flipAngle.current = 0;
    if (flipPivotRef.current) flipPivotRef.current.rotation.y = 0;
    setSpread((current) => {
      const next = Math.min(current + 1, totalSpreads - 1);
      onSpreadChange?.(next);
      return next;
    });
  }, [onSpreadChange, totalSpreads]);

  const finishBackwardFlip = useCallback(() => {
    setIsFlipping(false);
    setFlipBackward(false);
    animatingRef.current = false;
    flipProgress.current = 0;
    flipAngle.current = 0;
    if (flipPivotRef.current) flipPivotRef.current.rotation.y = 0;
    setSpread((current) => {
      const next = Math.max(current - 1, 0);
      onSpreadChange?.(next);
      return next;
    });
  }, [onSpreadChange]);

  const goNext = useCallback(() => {
    if (!coverOpen) {
      openCover();
      return;
    }
    if (!coverReady || isFlipping || spread >= totalSpreads - 1) return;

    if (reduceMotion) {
      setSpread((current) => {
        const next = Math.min(current + 1, totalSpreads - 1);
        onSpreadChange?.(next);
        return next;
      });
      return;
    }

    setFlipBackward(false);
    setIsFlipping(true);
    animatingRef.current = true;
    flipProgress.current = 0;
    flipAngle.current = 0;
  }, [coverOpen, coverReady, isFlipping, onSpreadChange, openCover, reduceMotion, spread, totalSpreads]);

  const goPrev = useCallback(() => {
    if (!coverOpen) return;
    if (isFlipping || animatingRef.current) return;
    if (!coverReady) {
      closeCover();
      return;
    }
    if (spread <= 0) {
      closeCover();
      return;
    }

    if (reduceMotion) {
      setSpread((current) => {
        const next = Math.max(current - 1, 0);
        onSpreadChange?.(next);
        return next;
      });
      return;
    }

    setFlipBackward(true);
    setIsFlipping(true);
    animatingRef.current = true;
    flipProgress.current = 0;
    flipAngle.current = -Math.PI;
  }, [closeCover, coverOpen, coverReady, isFlipping, onSpreadChange, reduceMotion, spread]);

  useEffect(() => {
    if (!coverOpen || coverDoneRef.current) return;
    targetCover.current = OPEN_COVER_ANGLE;
  }, [coverOpen]);

  useEffect(() => {
    onNavChange?.({
      spread,
      totalSpreads,
      coverOpen,
      canGoPrev: coverOpen && !isFlipping,
      canGoNext: !coverOpen || (coverReady && !isFlipping && spread < totalSpreads - 1),
      goPrev,
      goNext,
      openCover,
    });
  }, [
    coverOpen,
    coverReady,
    goNext,
    goPrev,
    isFlipping,
    onNavChange,
    openCover,
    spread,
    totalSpreads,
  ]);

  useFrame((_state, delta) => {
    const step = Math.min(1, delta * 7);

    if (floatRef.current) {
      entranceRef.current = Math.min(1, entranceRef.current + delta * 1.6);
      const entranceEase = 1 - (1 - entranceRef.current) ** 3;
      const baseY = THREE.MathUtils.lerp(-0.12, 0, entranceEase);
      floatRef.current.position.y = baseY;
    }

    if (coverOpen && !coverDoneRef.current) {
      coverAngle.current = THREE.MathUtils.lerp(coverAngle.current, targetCover.current, step);
      if (Math.abs(coverAngle.current - targetCover.current) < 0.004) {
        coverAngle.current = targetCover.current;
        coverDoneRef.current = true;
        setCoverReady(true);
        animatingRef.current = false;
      }
    }

    if (!coverOpen && coverAngle.current > 0.004) {
      coverAngle.current = THREE.MathUtils.lerp(coverAngle.current, targetCover.current, step);
      if (Math.abs(coverAngle.current) < 0.004) {
        coverAngle.current = 0;
        animatingRef.current = false;
      }
    }

    if (isFlipping && flipProgress.current < 1) {
      flipProgress.current = Math.min(1, flipProgress.current + delta / FLIP_DURATION);
      const eased = easeInOutCubic(flipProgress.current);
      flipAngle.current = flipBackward ? -Math.PI * (1 - eased) : -Math.PI * eased;
      if (flipPivotRef.current) flipPivotRef.current.rotation.y = flipAngle.current;

      if (flipProgress.current >= 1) {
        if (flipBackward) finishBackwardFlip();
        else finishForwardFlip();
      }
    }

    if (coverPivotRef.current) coverPivotRef.current.rotation.y = coverAngle.current;
  });

  const showSpread = coverOpen && coverReady;
  const leftZ = 0.014 + spread * PAGE_THICK * 0.45;
  const rightZ = 0.014 + spread * PAGE_THICK * 0.45 + PAGE_THICK;
  const flipSourceIndex = spread * 2 + 1;
  const flipTargetIndex = spread * 2 + 2;
  const flipUnderRightIndex = spread * 2 + 3;
  const flipBackSourceIndex = spread * 2 - 1;
  const flipBackTargetIndex = spread * 2;
  const flipUnderLeftIndex = spread * 2 - 2;
  const coverPivotZ = coverReady ? COVER_THICK * 0.45 + 0.012 - 0.12 : COVER_THICK * 0.45 + 0.012;

  return (
    <group ref={floatRef}>
      <group rotation={[0, 0, 0]}>
        {!showSpread ? (
          <mesh position={[0, 0, -COVER_THICK * 0.55]} castShadow receiveShadow>
            <boxGeometry args={[PAGE_W + 0.04, PAGE_H + 0.04, COVER_THICK]} />
            <meshStandardMaterial color="#0B1220" roughness={0.78} metalness={0.1} />
          </mesh>
        ) : null}

        {!showSpread ? (
          <>
            <mesh position={[0, 0, 0.002]} castShadow receiveShadow>
              <boxGeometry args={[PAGE_W - 0.02, PAGE_H - 0.02, pages.length * PAGE_THICK * 0.55]} />
              <PassportPaperMaterial />
            </mesh>
            <ClosedPageEdges layers={pages.length} />
          </>
        ) : null}

        {showSpread ? (
          <>
            <PassportSpineCrease z={leftZ - 0.001} />

            <PageSlot
              position={[LEFT_PAGE_X, 0, leftZ]}
              side="left"
              pageIndex={leftIndex}
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
            >
              {pageAt(pages, leftIndex)}
            </PageSlot>

            {!isFlipping ? (
              <PageSlot
                position={[RIGHT_PAGE_X, 0, rightZ]}
                side="right"
                pageIndex={rightIndex}
                onClick={(event) => {
                  event.stopPropagation();
                  goNext();
                }}
              >
                {pageAt(pages, rightIndex)}
              </PageSlot>
            ) : null}

            {isFlipping && !flipBackward ? (
              <>
                <PageSlot
                  position={[RIGHT_PAGE_X, 0, rightZ - PAGE_THICK]}
                  side="right"
                  pageIndex={flipUnderRightIndex}
                >
                  {pageAt(pages, flipUnderRightIndex)}
                </PageSlot>

                <group ref={flipPivotRef} position={[0, 0, rightZ + 0.01]}>
                  <PageTurnEdge />
                  <group position={[RIGHT_PAGE_X, 0, 0]}>
                    <PagePaperMesh side="right" />
                    <Html
                      transform
                      occlude={false}
                      distanceFactor={HTML_DISTANCE_FACTOR}
                      position={[0, 0, PAGE_THICK / 2 + 0.003]}
                      zIndexRange={[50, 0]}
                      style={{ pointerEvents: "none" }}
                    >
                      <PassportPageChrome
                        side="right"
                        stamp={passportPageStamp(flipSourceIndex)}
                      >
                        {pageAt(pages, flipSourceIndex)}
                      </PassportPageChrome>
                    </Html>
                  </group>
                  <group position={[RIGHT_PAGE_X, 0, -PAGE_THICK * 0.65]} rotation={[0, Math.PI, 0]}>
                    <PagePaperMesh side="left" />
                    <Html
                      transform
                      occlude={false}
                      distanceFactor={HTML_DISTANCE_FACTOR}
                      position={[0, 0, PAGE_THICK / 2 + 0.003]}
                      zIndexRange={[50, 0]}
                      style={{ pointerEvents: "none" }}
                    >
                      <PassportPageChrome
                        side="left"
                        stamp={passportPageStamp(flipTargetIndex)}
                      >
                        {pageAt(pages, flipTargetIndex)}
                      </PassportPageChrome>
                    </Html>
                  </group>
                </group>
              </>
            ) : null}

            {isFlipping && flipBackward ? (
              <>
                <PageSlot
                  position={[LEFT_PAGE_X, 0, leftZ - PAGE_THICK]}
                  side="left"
                  pageIndex={flipUnderLeftIndex}
                >
                  {pageAt(pages, flipUnderLeftIndex)}
                </PageSlot>

                <group ref={flipPivotRef} position={[0, 0, leftZ + 0.01]}>
                  <PageTurnEdge />
                  <group position={[LEFT_PAGE_X, 0, 0]}>
                    <PagePaperMesh side="left" />
                    <Html
                      transform
                      occlude={false}
                      distanceFactor={HTML_DISTANCE_FACTOR}
                      position={[0, 0, PAGE_THICK / 2 + 0.003]}
                      zIndexRange={[50, 0]}
                      style={{ pointerEvents: "none" }}
                    >
                      <PassportPageChrome
                        side="left"
                        stamp={passportPageStamp(flipBackTargetIndex)}
                      >
                        {pageAt(pages, flipBackTargetIndex)}
                      </PassportPageChrome>
                    </Html>
                  </group>
                  <group position={[LEFT_PAGE_X, 0, -PAGE_THICK * 0.65]} rotation={[0, Math.PI, 0]}>
                    <PagePaperMesh side="right" />
                    <Html
                      transform
                      occlude={false}
                      distanceFactor={HTML_DISTANCE_FACTOR}
                      position={[0, 0, PAGE_THICK / 2 + 0.003]}
                      zIndexRange={[50, 0]}
                      style={{ pointerEvents: "none" }}
                    >
                      <PassportPageChrome
                        side="right"
                        stamp={passportPageStamp(flipBackSourceIndex)}
                      >
                        {pageAt(pages, flipBackSourceIndex)}
                      </PassportPageChrome>
                    </Html>
                  </group>
                </group>
              </>
            ) : null}
          </>
        ) : null}

        <group ref={coverPivotRef} position={[-PAGE_W / 2, 0, coverPivotZ]}>
          <mesh
            position={[PAGE_W / 2, 0, 0]}
            castShadow
            receiveShadow
            onClick={(event) => {
              event.stopPropagation();
              if (!coverOpen) openCover();
            }}
          >
            <boxGeometry args={[PAGE_W, PAGE_H + 0.015, COVER_THICK]} />
            <PassportCoverMaterial reduceMotion={reduceMotion} />
          </mesh>
          {!coverOpen ? (
            <Html
              transform
              occlude={false}
              distanceFactor={HTML_DISTANCE_FACTOR}
              position={[PAGE_W / 2, 0, COVER_THICK / 2 + 0.002]}
              style={{ pointerEvents: "none" }}
            >
              <button
                type="button"
                onClick={openCover}
                className="cursor-pointer border-0 bg-transparent p-0"
                style={{ pointerEvents: "auto" }}
                aria-label="Open verified passport"
              >
                <PassportCoverFace subjectLabel={subjectLabel} />
              </button>
            </Html>
          ) : null}
          <mesh position={[0.012, 0, 0]}>
            <boxGeometry args={[0.02, PAGE_H * 0.92, COVER_THICK * 1.05]} />
            <meshStandardMaterial color="#070D18" roughness={0.85} />
          </mesh>
        </group>

        <OrbitControls
          enabled={coverReady && !isFlipping}
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI / 2.75}
          maxPolarAngle={Math.PI / 1.95}
          minAzimuthAngle={-0.22}
          maxAzimuthAngle={0.22}
          target={[0, 0, 0]}
        />
      </group>
    </group>
  );
}

function Scene(props: PassportBookCanvasProps) {
  return (
    <>
      <ambientLight intensity={0.78} />
      <directionalLight position={[2.5, 4.5, 3.5]} intensity={1.05} castShadow />
      <directionalLight position={[-3, 1.5, 2]} intensity={0.28} color="#6366F1" />
      <PassportBookScene {...props} />
    </>
  );
}

function PassportNavBar({ nav }: { nav: PassportNavState | null }) {
  if (!nav) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-3 px-1">
      <button
        type="button"
        onClick={() => nav.goPrev()}
        disabled={!nav.canGoPrev}
        className={cn(
          "rounded-lg border px-4 py-2.5 text-sm font-bold uppercase tracking-[0.12em]",
          nav.canGoPrev
            ? "border-[#6366F1]/40 bg-white text-[#6366F1] hover:bg-[#EDE9FE]"
            : "cursor-not-allowed border-[#C4B5FD]/40 bg-[#F8F7FF] text-[#94A3B8]",
        )}
      >
        Previous
      </button>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
        {nav.coverOpen ? `Spread ${nav.spread + 1} of ${nav.totalSpreads}` : "Cover closed"}
      </p>
      <button
        type="button"
        onClick={() => nav.goNext()}
        disabled={!nav.canGoNext}
        className={cn(
          "rounded-lg border px-4 py-2.5 text-sm font-bold uppercase tracking-[0.12em]",
          nav.canGoNext
            ? "border-[#6366F1]/40 bg-[#6366F1] text-white hover:bg-[#4F46E5]"
            : "cursor-not-allowed border-[#C4B5FD]/40 bg-[#F8F7FF] text-[#94A3B8]",
        )}
      >
        Next
      </button>
    </div>
  );
}

export function PassportBookCanvas({
  pages,
  subjectLabel,
  className,
  onSpreadChange,
  onNavChange,
}: PassportBookCanvasProps & { className?: string }) {
  const [nav, setNav] = useState<PassportNavState | null>(null);
  const camera = useMemo(
    () => ({ position: [0, 0, PASSPORT_CAMERA_Z] as [number, number, number], fov: PASSPORT_CAMERA_FOV, near: 0.1, far: 32 }),
    [],
  );

  return (
    <div className={className}>
      <div className="relative h-[min(94dvh,920px)] w-full">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={camera}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.shadowMap.type = THREE.PCFShadowMap;
            gl.setClearColor(0x000000, 0);
          }}
          className="rank-passport-3d-canvas absolute inset-0 touch-none"
        >
          <Scene
            pages={pages}
            subjectLabel={subjectLabel}
            onSpreadChange={onSpreadChange}
            onNavChange={(state) => {
              setNav(state);
              onNavChange?.(state);
            }}
          />
        </Canvas>
      </div>
      <PassportNavBar nav={nav} />
    </div>
  );
}
