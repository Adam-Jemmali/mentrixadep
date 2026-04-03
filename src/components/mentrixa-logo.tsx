"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";

const PX = { sm: 36, md: 52, lg: 72, xl: 96, hero: 160 } as const;

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
        />
      </div>
    </div>
  );
}

/**
 * Full loading — multi-orbit rings + 3D tumble (Stripe / Linear-style polish, no extra icons).
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
      <div className="relative flex items-center justify-center" style={{ width: outer, height: outer }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ width: outer - i * 20, height: outer - i * 20 }}
          >
            <div
              className={cn(
                "mx-loader-ring-spin h-full w-full rounded-full border-2 border-transparent",
                i === 0 && "mx-loader-ring-spin--a",
                i === 1 && "mx-loader-ring-spin--b",
                i === 2 && "mx-loader-ring-spin--c",
              )}
            />
          </div>
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
