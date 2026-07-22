"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import {
  PassportCoverFace,
  PassportPageChrome,
  PASSPORT_BOOK_SCALE,
  PASSPORT_CAMERA_FOV,
  PASSPORT_CAMERA_Z,
  PASSPORT_COVER_HTML_BOOST,
  PASSPORT_PAGE_H_UNITS,
  PASSPORT_PAGE_W_UNITS,
  passportHtmlDistanceFactor,
  passportPageStamp,
} from "@/features/rank-card/rank-passport-3d-decor";
import {
  canGoPassportNext,
  canGoPassportPrev,
  PASSPORT_ANIMATION_WATCHDOG_MS,
  spreadAfterCoverClosed,
} from "@/features/rank-card/rank-passport-3d-nav";
import {
  PassportCoverMaterial,
  PassportEdgeMaterial,
  PassportPaperMaterial,
} from "@/features/rank-card/rank-passport-3d-materials";
import { cn } from "@/shared/core/utils";

const PAGE_W = PASSPORT_PAGE_W_UNITS;
const PAGE_H = PASSPORT_PAGE_H_UNITS;
const PAGE_HALF = PAGE_W / 2;
const PAGE_THICK = 0.012;
const COVER_THICK = 0.032;
const EDGE_THICK = 0.006;
const SPINE_KISS = 0.008;
/** Left/right page centers — inner edges kiss at spine x = 0. */
const LEFT_PAGE_X = -(PAGE_HALF - SPINE_KISS / 2);
const RIGHT_PAGE_X = PAGE_HALF - SPINE_KISS / 2;
const OPEN_COVER_ANGLE = -Math.PI * 0.88;
const FLIP_DURATION = 0.88;
const COVER_PIVOT_Z = COVER_THICK * 0.45 + 0.012;

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

function PageOuterEdges({ side }: { side: "left" | "right" }) {
  const foreX = side === "left" ? -PAGE_HALF + EDGE_THICK / 2 : PAGE_HALF - EDGE_THICK / 2;
  return (
    <group>
      <mesh position={[foreX, 0, PAGE_THICK / 2 + EDGE_THICK / 2]}>
        <boxGeometry args={[EDGE_THICK, PAGE_H * 0.98, EDGE_THICK]} />
        <PassportEdgeMaterial color="#E8E2D4" />
      </mesh>
      <mesh position={[0, PAGE_H / 2 - EDGE_THICK / 2, PAGE_THICK / 2]}>
        <boxGeometry args={[PAGE_W * 0.98, EDGE_THICK, EDGE_THICK]} />
        <PassportEdgeMaterial color="#EDE8DC" />
      </mesh>
      <mesh position={[0, -PAGE_H / 2 + EDGE_THICK / 2, PAGE_THICK / 2]}>
        <boxGeometry args={[PAGE_W * 0.98, EDGE_THICK, EDGE_THICK]} />
        <PassportEdgeMaterial color="#EDE8DC" />
      </mesh>
    </group>
  );
}

function PagePaperMesh({ side }: { side: "left" | "right" }) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[PAGE_W, PAGE_H, PAGE_THICK]} />
        <PassportPaperMaterial />
      </mesh>
      <PageOuterEdges side={side} />
    </group>
  );
}

function PageSlot({
  position,
  side,
  pageIndex,
  htmlDistanceFactor,
  onClick,
  children,
}: {
  position: [number, number, number];
  side: "left" | "right";
  pageIndex: number;
  htmlDistanceFactor: number;
  onClick?: (event: { stopPropagation: () => void }) => void;
  children: ReactNode;
}) {
  const stamp = passportPageStamp(pageIndex);

  return (
    <group position={position}>
      <PagePaperMesh side={side} />
      <mesh onClick={onClick}>
        <boxGeometry args={[PAGE_W, PAGE_H, PAGE_THICK]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html
        transform
        occlude={false}
        distanceFactor={htmlDistanceFactor}
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
      <boxGeometry args={[PAGE_THICK, PAGE_H * 0.98, EDGE_THICK]} />
      <PassportPaperMaterial color="#E8E2D4" />
    </mesh>
  );
}

function PassportSpineGutter({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh>
        <boxGeometry args={[0.012, PAGE_H, PAGE_THICK * 1.1]} />
        <meshStandardMaterial color="#C9BFA8" roughness={1} />
      </mesh>
      <mesh position={[0, 0, PAGE_THICK * 0.05]}>
        <boxGeometry args={[0.006, PAGE_H * 0.96, 0.002]} />
        <meshStandardMaterial color="#A89880" roughness={1} />
      </mesh>
    </group>
  );
}

function PassportCoverShell({
  reduceMotion,
  showForeEdge,
  onClick,
}: {
  reduceMotion: boolean;
  showForeEdge: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group position={[PAGE_W / 2, 0, 0]}>
      <mesh castShadow receiveShadow onClick={onClick}>
        <boxGeometry args={[PAGE_W, PAGE_H, COVER_THICK]} />
        <PassportCoverMaterial reduceMotion={reduceMotion} />
      </mesh>
      {showForeEdge ? (
        <mesh position={[PAGE_W / 2 - EDGE_THICK / 2, 0, 0]}>
          <boxGeometry args={[EDGE_THICK, PAGE_H, COVER_THICK + 0.004]} />
          <PassportEdgeMaterial color="#070D18" />
        </mesh>
      ) : null}
      <mesh position={[0, PAGE_H / 2 - EDGE_THICK / 2, 0]}>
        <boxGeometry args={[PAGE_W, EDGE_THICK, COVER_THICK + 0.004]} />
        <PassportEdgeMaterial color="#0F172A" />
      </mesh>
      <mesh position={[0, -PAGE_H / 2 + EDGE_THICK / 2, 0]}>
        <boxGeometry args={[PAGE_W, EDGE_THICK, COVER_THICK + 0.004]} />
        <PassportEdgeMaterial color="#0F172A" />
      </mesh>
      <mesh position={[-PAGE_W / 2 + EDGE_THICK / 2, 0, -COVER_THICK / 2 - 0.001]}>
        <boxGeometry args={[EDGE_THICK, PAGE_H * 0.96, 0.004]} />
        <PassportEdgeMaterial color="#1E293B" />
      </mesh>
    </group>
  );
}

function resetOrbitControls(controls: OrbitControlsType | null) {
  if (!controls) return;
  controls.setAzimuthalAngle(0);
  controls.setPolarAngle(Math.PI / 2.1);
  controls.target.set(0, 0, 0);
  controls.update();
}

function PassportBookScene({
  pages,
  subjectLabel,
  htmlDistanceFactor,
  onSpreadChange,
  onNavChange,
}: PassportBookCanvasProps & { htmlDistanceFactor: number }) {
  const floatRef = useRef<THREE.Group>(null);
  const entranceRef = useRef(0);
  const controlsRef = useRef<OrbitControlsType>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverReady, setCoverReady] = useState(false);
  const [spread, setSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipBackward, setFlipBackward] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClosingCover, setIsClosingCover] = useState(false);

  const coverPivotRef = useRef<THREE.Group>(null);
  const flipPivotRef = useRef<THREE.Group>(null);
  const coverAngle = useRef(0);
  const flipAngle = useRef(0);
  const flipProgress = useRef(0);
  const targetCover = useRef(0);
  const coverDoneRef = useRef(false);
  const animatingRef = useRef(false);
  const animationStartedAt = useRef(0);

  const totalSpreads = spreadCount(pages.length);
  const leftIndex = spread * 2;
  const rightIndex = spread * 2 + 1;

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const beginAnimation = useCallback(() => {
    animatingRef.current = true;
    setIsAnimating(true);
    animationStartedAt.current = performance.now();
  }, []);

  const endAnimation = useCallback(() => {
    animatingRef.current = false;
    setIsAnimating(false);
  }, []);

  const closeCover = useCallback(() => {
    if (!coverOpen && !isClosingCover) return;
    setCoverReady(false);
    setCoverOpen(false);
    setIsClosingCover(true);
    coverDoneRef.current = false;
    targetCover.current = 0;
    beginAnimation();
  }, [beginAnimation, coverOpen, isClosingCover]);

  const openCover = useCallback(() => {
    if (coverOpen || animatingRef.current) return;
    setCoverOpen(true);
    targetCover.current = OPEN_COVER_ANGLE;
    beginAnimation();
  }, [beginAnimation, coverOpen]);

  const finishForwardFlip = useCallback(() => {
    setIsFlipping(false);
    setFlipBackward(false);
    endAnimation();
    flipProgress.current = 0;
    flipAngle.current = 0;
    if (flipPivotRef.current) flipPivotRef.current.rotation.y = 0;
    setSpread((current) => {
      const next = Math.min(current + 1, totalSpreads - 1);
      onSpreadChange?.(next);
      return next;
    });
    resetOrbitControls(controlsRef.current);
  }, [endAnimation, onSpreadChange, totalSpreads]);

  const finishBackwardFlip = useCallback(() => {
    setIsFlipping(false);
    setFlipBackward(false);
    endAnimation();
    flipProgress.current = 0;
    flipAngle.current = 0;
    if (flipPivotRef.current) flipPivotRef.current.rotation.y = 0;
    setSpread((current) => {
      const next = Math.max(current - 1, 0);
      onSpreadChange?.(next);
      return next;
    });
    resetOrbitControls(controlsRef.current);
  }, [endAnimation, onSpreadChange]);

  const goNext = useCallback(() => {
    if (isClosingCover || (animatingRef.current && !coverReady)) return;
    if (!coverOpen) {
      openCover();
      return;
    }
    if (!coverReady || isFlipping || animatingRef.current || spread >= totalSpreads - 1) return;

    if (reduceMotion) {
      setSpread((current) => {
        const next = Math.min(current + 1, totalSpreads - 1);
        onSpreadChange?.(next);
        return next;
      });
      resetOrbitControls(controlsRef.current);
      return;
    }

    setFlipBackward(false);
    setIsFlipping(true);
    beginAnimation();
    flipProgress.current = 0;
    flipAngle.current = 0;
  }, [
    beginAnimation,
    coverOpen,
    coverReady,
    isFlipping,
    onSpreadChange,
    openCover,
    reduceMotion,
    spread,
    totalSpreads,
    isClosingCover,
  ]);

  const goPrev = useCallback(() => {
    if (isClosingCover) return;
    if (!coverOpen) return;
    if (isFlipping) return;

    if (!coverReady) {
      closeCover();
      return;
    }

    if (animatingRef.current) return;

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
      resetOrbitControls(controlsRef.current);
      return;
    }

    setFlipBackward(true);
    setIsFlipping(true);
    beginAnimation();
    flipProgress.current = 0;
    flipAngle.current = -Math.PI;
  }, [closeCover, coverOpen, coverReady, isClosingCover, isFlipping, onSpreadChange, reduceMotion, spread, beginAnimation]);

  useEffect(() => {
    if (!coverOpen || coverDoneRef.current) return;
    targetCover.current = OPEN_COVER_ANGLE;
  }, [coverOpen]);

  useEffect(() => {
    onNavChange?.({
      spread,
      totalSpreads,
      coverOpen,
      canGoPrev: canGoPassportPrev({
        coverOpen,
        coverReady,
        isFlipping,
        isAnimating,
        isClosingCover,
        spread,
        totalSpreads,
      }),
      canGoNext: canGoPassportNext({
        coverOpen,
        coverReady,
        isFlipping,
        isAnimating,
        isClosingCover,
        spread,
        totalSpreads,
      }),
      goPrev,
      goNext,
      openCover,
    });
  }, [
    coverOpen,
    coverReady,
    goNext,
    goPrev,
    isAnimating,
    isClosingCover,
    isFlipping,
    onNavChange,
    openCover,
    spread,
    totalSpreads,
  ]);

  useFrame((_state, delta) => {
    const step = Math.min(1, delta * 7);
    const now = performance.now();

    if (animatingRef.current && now - animationStartedAt.current > PASSPORT_ANIMATION_WATCHDOG_MS) {
      if (isFlipping) {
        if (flipBackward) finishBackwardFlip();
        else finishForwardFlip();
      } else if (coverOpen && !coverDoneRef.current) {
        coverAngle.current = OPEN_COVER_ANGLE;
        coverDoneRef.current = true;
        setCoverReady(true);
        endAnimation();
      } else if (!coverOpen && coverAngle.current > 0.004) {
        coverAngle.current = 0;
        setSpread(spreadAfterCoverClosed());
        onSpreadChange?.(spreadAfterCoverClosed());
        setIsClosingCover(false);
        endAnimation();
        resetOrbitControls(controlsRef.current);
      } else {
        endAnimation();
      }
    }

    if (floatRef.current) {
      entranceRef.current = Math.min(1, entranceRef.current + delta * 1.6);
      const entranceEase = 1 - (1 - entranceRef.current) ** 3;
      floatRef.current.position.y = THREE.MathUtils.lerp(-0.12, 0, entranceEase);
    }

    if (coverOpen && !coverDoneRef.current) {
      coverAngle.current = THREE.MathUtils.lerp(coverAngle.current, targetCover.current, step);
      if (Math.abs(coverAngle.current - targetCover.current) < 0.004) {
        coverAngle.current = targetCover.current;
        coverDoneRef.current = true;
        setCoverReady(true);
        endAnimation();
        resetOrbitControls(controlsRef.current);
      }
    }

    if (!coverOpen && coverAngle.current > 0.004) {
      coverAngle.current = THREE.MathUtils.lerp(coverAngle.current, targetCover.current, step);
      if (Math.abs(coverAngle.current) < 0.004) {
        coverAngle.current = 0;
        endAnimation();
        setSpread(spreadAfterCoverClosed());
        onSpreadChange?.(spreadAfterCoverClosed());
        setIsClosingCover(false);
        resetOrbitControls(controlsRef.current);
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
  const showCoverGeometry = !showSpread;
  const stackZ = 0.014 + spread * PAGE_THICK * 0.45;
  const leftZ = stackZ;
  const rightZ = stackZ + PAGE_THICK;
  const flipSourceIndex = spread * 2 + 1;
  const flipTargetIndex = spread * 2 + 2;
  const flipUnderRightIndex = spread * 2 + 3;
  const flipBackSourceIndex = spread * 2 - 1;
  const flipBackTargetIndex = spread * 2;
  const flipUnderLeftIndex = spread * 2 - 2;
  const orbitEnabled = coverReady && !isFlipping && !isAnimating;

  return (
    <group ref={floatRef}>
      <group scale={PASSPORT_BOOK_SCALE}>
        {showSpread ? (
          <>
            <PassportSpineGutter z={leftZ + PAGE_THICK * 0.5} />

            <PageSlot
              position={[LEFT_PAGE_X, 0, leftZ]}
              side="left"
              pageIndex={leftIndex}
              htmlDistanceFactor={htmlDistanceFactor}
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
                htmlDistanceFactor={htmlDistanceFactor}
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
                  htmlDistanceFactor={htmlDistanceFactor}
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
                      distanceFactor={htmlDistanceFactor}
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
                      distanceFactor={htmlDistanceFactor}
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
                  htmlDistanceFactor={htmlDistanceFactor}
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
                      distanceFactor={htmlDistanceFactor}
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
                      distanceFactor={htmlDistanceFactor}
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

        {showCoverGeometry ? (
        <group ref={coverPivotRef} position={[-PAGE_W / 2, 0, COVER_PIVOT_Z]}>
          <PassportCoverShell
            reduceMotion={reduceMotion}
            showForeEdge={coverOpen}
            onClick={(event) => {
              event.stopPropagation();
              if (!coverOpen) openCover();
            }}
          />
          {!coverOpen ? (
            <Html
              transform
              occlude={false}
              distanceFactor={htmlDistanceFactor * PASSPORT_COVER_HTML_BOOST}
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
        </group>
        ) : null}

        <OrbitControls
          ref={controlsRef}
          enabled={orbitEnabled}
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI / 2.75}
          maxPolarAngle={Math.PI / 1.95}
          minAzimuthAngle={-0.12}
          maxAzimuthAngle={0.12}
          target={[0, 0, 0]}
        />
      </group>
    </group>
  );
}

function Scene({
  htmlDistanceFactor,
  ...props
}: PassportBookCanvasProps & { htmlDistanceFactor: number }) {
  return (
    <>
      <ambientLight intensity={0.78} />
      <directionalLight position={[2.5, 4.5, 3.5]} intensity={1.05} castShadow />
      <directionalLight position={[-3, 1.5, 2]} intensity={0.28} color="#6366F1" />
      <directionalLight position={[-2.5, 0.5, -2]} intensity={0.18} color="#94A3B8" />
      <PassportBookScene htmlDistanceFactor={htmlDistanceFactor} {...props} />
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportH, setViewportH] = useState(720);

  const htmlDistanceFactor = useMemo(
    () => passportHtmlDistanceFactor(PASSPORT_CAMERA_Z, PASSPORT_CAMERA_FOV, viewportH),
    [viewportH],
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setViewportH(entry.contentRect.height);
    });
    observer.observe(node);
    setViewportH(node.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  const camera = useMemo(
    () => ({
      position: [0, 0, PASSPORT_CAMERA_Z] as [number, number, number],
      fov: PASSPORT_CAMERA_FOV,
      near: 0.1,
      far: 32,
    }),
    [],
  );

  return (
    <div className={className}>
      <div ref={containerRef} className="relative h-[min(78dvh,720px)] w-full">
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
            htmlDistanceFactor={htmlDistanceFactor}
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
