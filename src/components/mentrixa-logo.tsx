"use client";

import Image from "next/image";
import { cn } from "@/shared/core/utils";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";

const PX = { sm: 44, md: 60, lg: 80, xl: 104, hero: 160 } as const;

type Size = keyof typeof PX;

type LogoProps = {
  size?: Size;
  className?: string;
  priority?: boolean;
};

/** Static mark — subtle 3D float (auth header, nav). */
export function MentrixaLogoMark({ size = "md", className, priority }: LogoProps) {
  const w = PX[size];
  return (
    <div
      className={cn("relative mx-logo-mark-wrap select-none", className)}
      style={{ width: w, height: w }}
    >
      <div className="mx-logo-mark-inner h-full w-full">
        <Image
          src={MENTRIXA_LOGO_PNG}
          alt="Mentrixa"
          width={w}
          height={w}
          className="h-full w-full object-contain drop-shadow-[0_8px_32px_rgba(59,130,246,0.35)]"
          priority={priority}
          fetchPriority={priority ? "high" : undefined}
          sizes={`${w}px`}
        />
      </div>
    </div>
  );
}

type OrbitRingSpec = {
  inset: number;
  strokeWidth: number;
  dasharray: string;
  strokeClass: string;
  durationSec: number;
  reverse?: boolean;
};

function LoaderOrbitRing({
  outer,
  spec,
}: {
  outer: number;
  spec: OrbitRingSpec;
}) {
  const size = outer - spec.inset;
  const radius = (size - spec.strokeWidth) / 2;
  const center = size / 2;

  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2"
      style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full overflow-visible"
        aria-hidden
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={spec.strokeWidth}
          strokeDasharray={spec.dasharray}
          strokeLinecap="round"
          className={cn(
            "mx-loader-orbit-stroke mx-loader-orbit-dash",
            spec.strokeClass,
            spec.reverse && "mx-loader-orbit-dash--reverse",
          )}
          style={{
            ["--orbit-duration" as string]: `${spec.durationSec}s`,
            ["--orbit-circ" as string]: String(circumference),
          }}
        />
      </svg>
    </div>
  );
}

const LOADER_ORBIT_RINGS: OrbitRingSpec[] = [
  {
    inset: 0,
    strokeWidth: 3,
    dasharray: "52 22 28 22",
    strokeClass: "mx-loader-orbit-stroke--outer",
    durationSec: 2.4,
  },
  {
    inset: 20,
    strokeWidth: 2,
    dasharray: "18 10",
    strokeClass: "mx-loader-orbit-stroke--middle",
    durationSec: 1.8,
    reverse: true,
  },
  {
    inset: 40,
    strokeWidth: 1.75,
    dasharray: "12 7",
    strokeClass: "mx-loader-orbit-stroke--inner",
    durationSec: 1.35,
  },
];

/**
 * Full loading — segmented orbit rings travel 360° around the mark + 3D tumble.
 */
export function MentrixaLogoLoader({
  size = "lg",
  className,
  label,
}: LogoProps & { label?: string }) {
  const w = PX[size];
  const outer = w + 56;

  return (
    <div className={cn("flex flex-col items-center gap-5", className)} role="status" aria-label={label || "Loading"}>
      <div className="relative flex items-center justify-center overflow-visible" style={{ width: outer, height: outer }}>
        {LOADER_ORBIT_RINGS.map((spec) => (
          <LoaderOrbitRing key={spec.inset} outer={outer} spec={spec} />
        ))}
        <div
          className="absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 mx-logo-tumble"
          style={{ width: w, height: w }}
        >
          <Image src={MENTRIXA_LOGO_PNG} alt="" width={w} height={w} className="h-full w-full object-contain" />
        </div>
        <span
          className="pointer-events-none absolute z-0 rounded-full mx-loader-bloom"
          style={{ width: outer * 0.95, height: outer * 0.95 }}
          aria-hidden
        />
      </div>
      {label ? <p className="text-sm font-medium tracking-wide text-slate-500">{label}</p> : null}
    </div>
  );
}
