"use client";

import { Html } from "@react-three/drei";
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
  PASSPORT_BOOK_SCALE,
  PASSPORT_CAMERA_FOV,
  PASSPORT_CAMERA_Z_CLOSED,
  PASSPORT_CAMERA_Z_OPEN,
  PASSPORT_PAGE_H_PX,
  PASSPORT_PAGE_H_UNITS,
  PASSPORT_PAGE_W_PX,
  PASSPORT_PAGE_W_UNITS,
  passportHtmlDistanceFactor,
  passportPagePaperTone,
  passportPageSecurityVariant,
  passportPageStamp,
} from "@/features/rank-card/rank-passport-3d-decor";
import {
  canGoPassportNext,
  canGoPassportPrev,
  isPassportPageTurnBlocked,
  PASSPORT_ANIMATION_WATCHDOG_MS,
  spreadAfterCoverClosed,
  type PassportNavContext,
} from "@/features/rank-card/rank-passport-3d-nav";
import { PassportPaperMaterial } from "@/features/rank-card/rank-passport-3d-materials";

const PAGE_W = PASSPORT_PAGE_W_UNITS;
const PAGE_H = PASSPORT_PAGE_H_UNITS;
const PAGE_HALF = PAGE_W / 2;
const PAGE_THICK = 0.012;
const COVER_THICK = 0.032;
const EDGE_THICK = 0.006;
/** Left/right page centers — inner edges meet at spine x = 0. */
const LEFT_PAGE_X = -PAGE_HALF;
const RIGHT_PAGE_X = PAGE_HALF;
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
  interactivePages?: boolean[];
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

function SpreadPagePlane() {
  return (
    <mesh receiveShadow>
      <boxGeometry args={[PAGE_W, PAGE_H, PAGE_THICK]} />
      <meshStandardMaterial color="#fef9c3" roughness={0.94} metalness={0.02} />
    </mesh>
  );
}

function PageSlot({
  position,
  side,
  pageIndex,
  htmlDistanceFactor,
  onPageClick,
  interactiveContent = false,
  animateStamp,
  stampEpoch,
  children,
}: {
  position: [number, number, number];
  side: "left" | "right";
  pageIndex: number;
  htmlDistanceFactor: number;
  onPageClick?: () => void;
  interactiveContent?: boolean;
  animateStamp?: boolean;
  stampEpoch?: number;
  children: ReactNode;
}) {
  const stamp = passportPageStamp(pageIndex);
  const securityVariant = passportPageSecurityVariant(pageIndex);
  const paperTone = passportPagePaperTone(pageIndex);
  const navLabel = side === "left" ? "Turn to previous spread" : "Turn to next spread";

  const pageChrome = (
    <PassportPageChrome
      side={side}
      stamp={stamp}
      animateStamp={animateStamp}
      stampEpoch={stampEpoch}
      securityVariant={securityVariant}
      paperTone={paperTone}
    >
      {children}
    </PassportPageChrome>
  );

  return (
    <group position={position}>
      <SpreadPagePlane />
      <mesh>
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
        {onPageClick && interactiveContent ? (
          <div
            role="button"
            tabIndex={0}
            className="block cursor-pointer overflow-hidden border-0 bg-transparent p-0 outline-none"
            style={{
              pointerEvents: "auto",
              width: PASSPORT_PAGE_W_PX,
              height: PASSPORT_PAGE_H_PX,
            }}
            aria-label={navLabel}
            onClick={onPageClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onPageClick();
              }
            }}
          >
            {pageChrome}
          </div>
        ) : onPageClick ? (
          <button
            type="button"
            onClick={onPageClick}
            className="block cursor-pointer overflow-hidden border-0 bg-transparent p-0"
            style={{
              pointerEvents: "auto",
              width: PASSPORT_PAGE_W_PX,
              height: PASSPORT_PAGE_H_PX,
            }}
            aria-label={navLabel}
          >
            {pageChrome}
          </button>
        ) : (
          <div style={{ pointerEvents: "none" }}>{pageChrome}</div>
        )}
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

function PassportBookScene({
  pages,
  interactivePages = [],
  subjectLabel,
  htmlDistanceFactor,
  onSpreadChange,
  onNavChange,
}: PassportBookCanvasProps & { htmlDistanceFactor: number }) {
  const floatRef = useRef<THREE.Group>(null);
  const entranceRef = useRef(0);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverReady, setCoverReady] = useState(false);
  const [spread, setSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipBackward, setFlipBackward] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClosingCover, setIsClosingCover] = useState(false);
  const [stampEpoch, setStampEpoch] = useState(0);

  const bumpStampEpoch = useCallback(() => {
    setStampEpoch((epoch) => epoch + 1);
  }, []);

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

  const getNavContext = useCallback(
    (): PassportNavContext => ({
      coverOpen,
      coverReady,
      isFlipping,
      isAnimating,
      isClosingCover,
      spread,
      totalSpreads,
    }),
    [coverOpen, coverReady, isFlipping, isAnimating, isClosingCover, spread, totalSpreads],
  );

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

  const finalizeCoverClosed = useCallback(() => {
    coverAngle.current = 0;
    if (coverPivotRef.current) coverPivotRef.current.rotation.y = 0;
    coverDoneRef.current = false;
    targetCover.current = 0;
    setIsClosingCover(false);
    setSpread(spreadAfterCoverClosed());
    onSpreadChange?.(spreadAfterCoverClosed());
    endAnimation();
  }, [endAnimation, onSpreadChange]);

  const closeCover = useCallback(() => {
    if (!coverOpen && !isClosingCover) return;
    setIsFlipping(false);
    setFlipBackward(false);
    flipProgress.current = 0;
    flipAngle.current = 0;
    if (flipPivotRef.current) flipPivotRef.current.rotation.y = 0;
    setCoverReady(false);
    setCoverOpen(false);
    setIsClosingCover(true);
    coverDoneRef.current = false;
    targetCover.current = 0;
    if (Math.abs(coverAngle.current) <= 0.004) {
      finalizeCoverClosed();
      return;
    }
    beginAnimation();
  }, [beginAnimation, coverOpen, finalizeCoverClosed, isClosingCover]);

  const resetToClosedCover = useCallback(() => {
    coverAngle.current = 0;
    coverDoneRef.current = false;
    targetCover.current = 0;
    if (coverPivotRef.current) coverPivotRef.current.rotation.y = 0;
    setCoverOpen(false);
    setCoverReady(false);
    setIsClosingCover(false);
    setSpread(spreadAfterCoverClosed());
    onSpreadChange?.(spreadAfterCoverClosed());
    endAnimation();
  }, [endAnimation, onSpreadChange]);

  const openCover = useCallback(() => {
    if (coverOpen) return;
    if (isClosingCover) return;
    coverDoneRef.current = false;
    setCoverOpen(true);
    setCoverReady(false);
    targetCover.current = OPEN_COVER_ANGLE;
    beginAnimation();
  }, [beginAnimation, coverOpen, isClosingCover]);

  const finishForwardFlip = useCallback(() => {
    if (flipPivotRef.current) flipPivotRef.current.rotation.y = 0;
    flipProgress.current = 0;
    flipAngle.current = 0;
    setIsFlipping(false);
    setFlipBackward(false);
    endAnimation();
    setSpread((current) => {
      const next = Math.min(current + 1, totalSpreads - 1);
      onSpreadChange?.(next);
      return next;
    });
    bumpStampEpoch();
  }, [bumpStampEpoch, endAnimation, onSpreadChange, totalSpreads]);

  const finishBackwardFlip = useCallback(() => {
    if (flipPivotRef.current) flipPivotRef.current.rotation.y = 0;
    flipProgress.current = 0;
    flipAngle.current = 0;
    setIsFlipping(false);
    setFlipBackward(false);
    endAnimation();
    setSpread((current) => {
      const next = Math.max(current - 1, 0);
      onSpreadChange?.(next);
      return next;
    });
    bumpStampEpoch();
  }, [bumpStampEpoch, endAnimation, onSpreadChange]);

  const goNext = useCallback(() => {
    const ctx = getNavContext();
    if (!canGoPassportNext(ctx)) return;

    if (!coverOpen) {
      openCover();
      return;
    }

    if (spread >= totalSpreads - 1) {
      if (reduceMotion) {
        resetToClosedCover();
        return;
      }
      closeCover();
      return;
    }

    if (reduceMotion) {
      setSpread((current) => {
        const next = Math.min(current + 1, totalSpreads - 1);
        onSpreadChange?.(next);
        return next;
      });
      bumpStampEpoch();
      return;
    }

    setFlipBackward(false);
    setIsFlipping(true);
    beginAnimation();
    flipProgress.current = 0;
    flipAngle.current = 0;
  }, [
    beginAnimation,
    bumpStampEpoch,
    closeCover,
    coverOpen,
    getNavContext,
    onSpreadChange,
    openCover,
    reduceMotion,
    resetToClosedCover,
    spread,
    totalSpreads,
  ]);

  const goPrev = useCallback(() => {
    const ctx = getNavContext();
    if (!canGoPassportPrev(ctx)) return;

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
      bumpStampEpoch();
      return;
    }

    setFlipBackward(true);
    setIsFlipping(true);
    beginAnimation();
    flipProgress.current = 0;
    flipAngle.current = -Math.PI;
  }, [
    beginAnimation,
    bumpStampEpoch,
    closeCover,
    coverReady,
    getNavContext,
    onSpreadChange,
    reduceMotion,
    spread,
  ]);

  useEffect(() => {
    if (!coverOpen || coverDoneRef.current) return;
    targetCover.current = OPEN_COVER_ANGLE;
  }, [coverOpen]);

  useEffect(() => {
    if (coverOpen && coverReady) bumpStampEpoch();
  }, [coverOpen, coverReady, bumpStampEpoch]);

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
    const spreadOpen = coverOpen && coverReady;
    _state.camera.position.z = THREE.MathUtils.lerp(
      _state.camera.position.z,
      spreadOpen ? PASSPORT_CAMERA_Z_OPEN : PASSPORT_CAMERA_Z_CLOSED,
      Math.min(1, delta * 6),
    );

    if (animatingRef.current && now - animationStartedAt.current > PASSPORT_ANIMATION_WATCHDOG_MS) {
      if (isFlipping) {
        if (flipBackward) finishBackwardFlip();
        else finishForwardFlip();
      } else if (coverOpen && !coverDoneRef.current) {
        coverAngle.current = OPEN_COVER_ANGLE;
        coverDoneRef.current = true;
        setCoverReady(true);
        endAnimation();
      } else if (!coverOpen && Math.abs(coverAngle.current) > 0.004) {
        finalizeCoverClosed();
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
      }
    }

    if (!coverOpen && Math.abs(coverAngle.current) > 0.004) {
      coverAngle.current = THREE.MathUtils.lerp(coverAngle.current, targetCover.current, step);
      if (Math.abs(coverAngle.current) < 0.004) {
        coverAngle.current = 0;
        if (coverPivotRef.current) coverPivotRef.current.rotation.y = 0;
        finalizeCoverClosed();
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
  const showCoverFace = !coverOpen && !coverReady && !isClosingCover && !isAnimating;
  const showCoverPivot = !showSpread && !showCoverFace;
  const stackZ = 0.014 + spread * PAGE_THICK * 0.45;
  const leftZ = stackZ;
  const rightZ = stackZ + PAGE_THICK;
  const flipSourceIndex = spread * 2 + 1;
  const flipTargetIndex = spread * 2 + 2;
  const flipUnderRightIndex = spread * 2 + 3;
  const flipBackSourceIndex = spread * 2 - 1;
  const flipBackTargetIndex = spread * 2;
  const flipUnderLeftIndex = spread * 2 - 2;
  const pageTurnBlocked = isPassportPageTurnBlocked({ isFlipping, isClosingCover });
  const navCtx = getNavContext();
  const canPrev = canGoPassportPrev(navCtx);
  const canNext = canGoPassportNext(navCtx);
  const animateStamp = !reduceMotion && stampEpoch > 0;
  const pageInteractive = (index: number) => interactivePages[index] ?? false;

  return (
    <group ref={floatRef}>
      <group scale={PASSPORT_BOOK_SCALE}>
        {showSpread ? (
          <>
            <PassportSpineGutter z={leftZ + PAGE_THICK * 0.5} />

            {!pageTurnBlocked && !(isFlipping && flipBackward) ? (
              <PageSlot
                position={[LEFT_PAGE_X, 0, leftZ]}
                side="left"
                pageIndex={leftIndex}
                htmlDistanceFactor={htmlDistanceFactor}
                animateStamp={animateStamp}
                stampEpoch={stampEpoch}
                interactiveContent={pageInteractive(leftIndex)}
                onPageClick={canPrev ? goPrev : undefined}
              >
                {pageAt(pages, leftIndex)}
              </PageSlot>
            ) : null}

            {!pageTurnBlocked ? (
              <PageSlot
                position={[RIGHT_PAGE_X, 0, rightZ]}
                side="right"
                pageIndex={rightIndex}
                htmlDistanceFactor={htmlDistanceFactor}
                animateStamp={animateStamp}
                stampEpoch={stampEpoch}
                interactiveContent={pageInteractive(rightIndex)}
                onPageClick={canNext ? goNext : undefined}
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
                    <SpreadPagePlane />
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
                        animateStamp={animateStamp}
                        stampEpoch={stampEpoch}
                        securityVariant={passportPageSecurityVariant(flipSourceIndex)}
                        paperTone={passportPagePaperTone(flipSourceIndex)}
                      >
                        {pageAt(pages, flipSourceIndex)}
                      </PassportPageChrome>
                    </Html>
                  </group>
                  <group position={[RIGHT_PAGE_X, 0, -PAGE_THICK * 0.65]} rotation={[0, Math.PI, 0]}>
                    <SpreadPagePlane />
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
                        animateStamp={animateStamp}
                        stampEpoch={stampEpoch}
                        securityVariant={passportPageSecurityVariant(flipTargetIndex)}
                        paperTone={passportPagePaperTone(flipTargetIndex)}
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
                    <SpreadPagePlane />
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
                        animateStamp={animateStamp}
                        stampEpoch={stampEpoch}
                        securityVariant={passportPageSecurityVariant(flipBackTargetIndex)}
                        paperTone={passportPagePaperTone(flipBackTargetIndex)}
                      >
                        {pageAt(pages, flipBackTargetIndex)}
                      </PassportPageChrome>
                    </Html>
                  </group>
                  <group position={[LEFT_PAGE_X, 0, -PAGE_THICK * 0.65]} rotation={[0, Math.PI, 0]}>
                    <SpreadPagePlane />
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
                        animateStamp={animateStamp}
                        stampEpoch={stampEpoch}
                        securityVariant={passportPageSecurityVariant(flipBackSourceIndex)}
                        paperTone={passportPagePaperTone(flipBackSourceIndex)}
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

        {showCoverFace ? (
          <group position={[0, 0, COVER_PIVOT_Z]}>
            <Html
              transform
              occlude={false}
              distanceFactor={htmlDistanceFactor}
              position={[0, 0, COVER_THICK / 2 + 0.002]}
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
          </group>
        ) : null}

        {showCoverPivot ? (
        <group ref={coverPivotRef} position={[-PAGE_W / 2, 0, COVER_PIVOT_Z]}>
          <group position={[PAGE_W / 2, 0, 0]}>
            <mesh
              onClick={(event) => {
                event.stopPropagation();
                if (!coverOpen) openCover();
              }}
            >
              <boxGeometry args={[PAGE_W, PAGE_H, COVER_THICK]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        </group>
        ) : null}
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

export function PassportBookCanvas({
  pages,
  interactivePages,
  subjectLabel,
  className,
  onSpreadChange,
  onNavChange,
}: PassportBookCanvasProps & { className?: string }) {
  const htmlDistanceFactor = useMemo(() => passportHtmlDistanceFactor(), []);

  const camera = useMemo(
    () => ({
      position: [0, 0, PASSPORT_CAMERA_Z_CLOSED] as [number, number, number],
      fov: PASSPORT_CAMERA_FOV,
      near: 0.1,
      far: 32,
    }),
    [],
  );

  return (
    <div className={className}>
      <div className="relative h-[min(78dvh,720px)] w-full">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={camera}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.shadowMap.type = THREE.PCFShadowMap;
            gl.setClearColor(0x000000, 0);
          }}
          className="rank-passport-3d-canvas absolute inset-0"
        >
          <Scene
            pages={pages}
            interactivePages={interactivePages}
            subjectLabel={subjectLabel}
            htmlDistanceFactor={htmlDistanceFactor}
            onSpreadChange={onSpreadChange}
            onNavChange={onNavChange}
          />
        </Canvas>
      </div>
    </div>
  );
}
