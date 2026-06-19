"use client";

import { useState } from "react";
import { isTrustedGuestVisualPickUrl } from "@/features/quest/guest-try-types";
import { cn } from "@/shared/core/utils";

const FALLBACK_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="#f8fafc"/><g stroke="#cbd5e1" stroke-width="1"><line x1="48" y1="24" x2="48" y2="168"/><line x1="48" y1="168" x2="292" y2="168"/></g><text x="160" y="104" text-anchor="middle" font-size="14" fill="#64748b">Exam visual</text></svg>`,
  );

export function GuestVisualPickImage({
  src,
  label,
  className,
}: {
  src: string;
  label: string;
  className?: string;
}) {
  const initial = isTrustedGuestVisualPickUrl(src) ? src : FALLBACK_SVG;
  const [currentSrc, setCurrentSrc] = useState(initial);
  const [failed, setFailed] = useState(!isTrustedGuestVisualPickUrl(src));

  return (
    <div className={cn("relative h-20 w-full", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt={label}
        className="h-full w-full object-contain p-1"
        onError={() => {
          if (currentSrc !== FALLBACK_SVG) {
            setCurrentSrc(FALLBACK_SVG);
            setFailed(true);
          }
        }}
      />
      {failed ? (
        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
          Diagram preview
        </span>
      ) : null}
    </div>
  );
}
