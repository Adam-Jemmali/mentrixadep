"use client";

/**
 * PostCallSummary — shown immediately after a session ends.
 * Displays duration, recording status, and AI package generation progress.
 * Auto-redirects after 5 seconds or on manual CTA click.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { CheckCircle, Clock, Film, Loader2, ArrowRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostCallSummaryProps {
  sessionId: string;
  userRole: "student" | "tutor";
  durationSeconds: number;
  recordingSaved: boolean;
  whiteboardSnapshotUrl?: string | null;
  onClose?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h}h ${rem}m`;
  }
  return `${m}m ${s > 0 ? `${s}s` : ""}`.trim();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PostCallSummary({
  sessionId: _sessionId,
  userRole,
  durationSeconds,
  recordingSaved,
  whiteboardSnapshotUrl,
  onClose,
}: PostCallSummaryProps) {
  void _sessionId;
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState(8);

  const destination =
    userRole === "tutor"
      ? `/tutor/sessions-ai`
      : `/student`;

  const ctaLabel =
    userRole === "tutor"
      ? "Open AI Studio"
      : "Rate your session";

  const redirectNote =
    userRole === "tutor"
      ? "Opening Studio where you can build the AI package for your learner."
      : "You'll be taken to rate this session and see your study package.";

  // Entrance animation
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 24, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" }
    );
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((v) => {
        if (v <= 1) {
          clearInterval(timer);
          router.push(destination);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [destination, router]);

  const handleCta = () => {
    onClose?.();
    router.push(destination);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
      <div
        ref={cardRef}
        className="w-full max-w-md opacity-0 rounded-xl border border-white/10 bg-[#0f1014] p-6"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle size={18} className="text-emerald-400" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Session complete</p>
            <p className="text-xs text-white/40 mt-0.5">{redirectNote}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={12} className="text-white/30" />
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
                Duration
              </span>
            </div>
            <p className="text-sm font-medium text-white tabular-nums">
              {formatDuration(durationSeconds)}
            </p>
          </div>

          <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Film size={12} className="text-white/30" />
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
                Recording
              </span>
            </div>
            <p className="text-sm font-medium text-white">
              {recordingSaved ? "Saved" : "Not recorded"}
            </p>
          </div>
        </div>

        {/* AI package status */}
        {userRole === "tutor" && (
          <div className="mb-5 rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">AI package</p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Open Studio to generate your learner&apos;s study kit
                </p>
              </div>
              <Loader2 size={14} className="text-white/30 animate-spin" />
            </div>
          </div>
        )}

        {whiteboardSnapshotUrl && (
          <div className="mb-5 rounded-lg border border-white/8 overflow-hidden">
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium px-3 py-2 border-b border-white/8">
              Whiteboard snapshot
            </p>
            <Image
              src={whiteboardSnapshotUrl}
              alt="Whiteboard snapshot"
              width={512}
              height={128}
              unoptimized
              className="w-full object-contain max-h-32 bg-[#111]"
            />
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleCta}
          className="w-full flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-white/90 transition-colors active:scale-[0.98]"
        >
          <span>{ctaLabel}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 tabular-nums">
              {countdown}s
            </span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </div>
        </button>

        <p className="text-center text-[10px] text-white/20 mt-3">
          Auto-redirecting in {countdown} seconds
        </p>
      </div>
    </div>
  );
}
