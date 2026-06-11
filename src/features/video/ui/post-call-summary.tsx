"use client";

/**
 * PostCallSummary — shown immediately after a session ends.
 * Displays duration, recording status, and AI package generation progress.
 * Auto-redirects after 5 seconds or on manual CTA click.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { CheckCircle, Clock, Film, ArrowRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostCallRecordingMode = "hidden" | "saved" | "failed" | "none";

interface PostCallSummaryProps {
  sessionId: string;
  userRole: "student" | "tutor";
  durationSeconds: number;
  /** Tutor cloud recording outcome; hidden for learners. */
  recordingMode: PostCallRecordingMode;
  /** Each time the guide stopped recording and a file was saved to the device (same session). */
  localRecordingDownloadCount?: number;
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
  recordingMode,
  localRecordingDownloadCount = 0,
  whiteboardSnapshotUrl,
  onClose,
}: PostCallSummaryProps) {
  void _sessionId;
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const autoRedirectDoneRef = useRef(false);
  const navigationDoneRef = useRef(false);
  const [countdown, setCountdown] = useState(8);

  const destination =
    userRole === "tutor"
      ? "/tutor/sessions-ai"
      : "/student?sessionsTab=past#sessions-history";

  const destinationLabel =
    userRole === "tutor" ? "Studio (sessions & packages)" : "Sessions → History";

  const ctaLabel =
    userRole === "tutor" ? "Open Studio" : "Open session history";

  const redirectNote =
    userRole === "tutor"
      ? "Next: Studio — pick this session to build or publish your learner’s Quest package."
      : "Next: Sessions → History — rate this call and open past session details.";

  useGsapEffect((gsap) => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 24, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" },
    );
  }, []);

  // Auto-redirect countdown (never call router.push inside setState — it updates Router during render).
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((v) => {
        if (v <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown !== 0 || autoRedirectDoneRef.current || navigationDoneRef.current) return;
    autoRedirectDoneRef.current = true;
    const id = window.setTimeout(() => {
      if (navigationDoneRef.current) return;
      navigationDoneRef.current = true;
      onClose?.();
      router.replace(destination);
    }, 0);
    return () => window.clearTimeout(id);
  }, [countdown, destination, onClose, router]);

  const handleCta = () => {
    if (navigationDoneRef.current) return;
    navigationDoneRef.current = true;
    autoRedirectDoneRef.current = true;
    onClose?.();
    router.replace(destination);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4">
      <div
        ref={cardRef}
        className="w-full max-w-md opacity-0 rounded-xl border border-white/10 bg-[#0f1014] p-6"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15">
            <CheckCircle size={18} className="text-blue-400" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Session complete</p>
            <p className="text-xs text-white/40 mt-0.5">{redirectNote}</p>
            <p className="text-[10px] text-white/25 mt-1.5 font-medium uppercase tracking-wide">
              → {destinationLabel}
            </p>
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

          {recordingMode !== "hidden" ? (
            <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <Film size={12} className="text-white/30" />
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
                  Recording
                </span>
              </div>
              <p className="text-sm font-medium text-white">
                {recordingMode === "saved" ? (
                  <span className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <CheckCircle size={14} /> Saved to library
                    </span>
                    {localRecordingDownloadCount > 0 ? (
                      <span className="text-[11px] font-normal text-white/45 pl-[22px]">
                        {localRecordingDownloadCount} local file
                        {localRecordingDownloadCount === 1 ? "" : "s"} saved this session (e.g. Downloads)
                      </span>
                    ) : null}
                  </span>
                ) : recordingMode === "failed" ? (
                  <span className="flex flex-col gap-1 text-amber-200/95">
                    {localRecordingDownloadCount > 0 ? (
                      <>
                        <span className="font-medium text-white">
                          {localRecordingDownloadCount} recording
                          {localRecordingDownloadCount === 1 ? "" : "s"} saved locally this session
                        </span>
                        <span className="text-[11px] text-amber-100/80 font-normal leading-snug">
                          Cloud backup didn&apos;t complete for the last upload — your device copies are still in
                          Downloads (or your chosen folder).
                        </span>
                      </>
                    ) : (
                      <span className="text-[12px] leading-snug">
                        Session recording didn&apos;t finish uploading, and no local file was saved from this call.
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-white/50">No recording this session</span>
                )}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <Film size={12} className="text-white/30" />
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
                  Session
                </span>
              </div>
              <p className="text-sm font-medium text-white/70">Wrap-up complete</p>
            </div>
          )}
        </div>

        {/* AI package status */}
        {userRole === "tutor" && (
          <div className="mb-5 rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-white">AI package</p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Open Studio to generate your learner&apos;s study kit
                </p>
              </div>
              <CheckCircle size={14} className="text-emerald-400/80 shrink-0" aria-hidden />
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
          type="button"
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
