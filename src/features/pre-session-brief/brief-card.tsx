"use client";

/**
 * PreSessionBriefCard — in-app notification card rendered on the student hub.
 * Shows when a brief has been generated for a session starting within ~2 hours.
 * Expandable accordion design: collapsed = teaser, expanded = full brief.
 */

import { useState, useRef } from "react";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { ChevronDown, Brain, AlertTriangle, MessageSquare, Clock } from "lucide-react";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { StoredPreSessionBrief } from "@/features/pre-session-brief/brief";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreSessionBriefCardProps {
  brief: StoredPreSessionBrief & {
    sessionCourse: string;
    sessionStartTime: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function minutesUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
}

function formatCountdown(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Section components ───────────────────────────────────────────────────────

function SectionLabel({
  icon: Icon,
  vocabIcon,
  label,
  color,
}: {
  icon?: React.ElementType;
  vocabIcon?: "practice-pack" | "quest" | "brief";
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {vocabIcon ? (
        <MentrixaVocabIcon name={vocabIcon} size={12} className={color} title={label} />
      ) : Icon ? (
        <Icon size={12} className={color} strokeWidth={2.5} />
      ) : null}
      <span className={`text-[10px] font-semibold uppercase tracking-widest ${color}`}>
        {label}
      </span>
    </div>
  );
}

function BulletList({ items, muted }: { items: string[]; muted?: boolean }) {
  return (
    <ul className="space-y-1.5 pl-0 list-none">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-slate-400" />
          <span className={`text-sm leading-relaxed ${muted ? "text-slate-500" : "text-slate-700"}`}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function PreSessionBriefCard({ brief }: PreSessionBriefCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [warmUpRevealed, setWarmUpRevealed] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const minsLeft = minutesUntil(brief.sessionStartTime);
  const isImminent = minsLeft <= 30;

  useGsapEffect((gsap) => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", delay: 0.1 },
    );
  }, []);

  useGsapEffect((gsap) => {
    const el = bodyRef.current;
    if (!el) return;
    if (expanded) {
      gsap.set(el, { height: "auto", opacity: 1 });
      const height = el.scrollHeight;
      gsap.fromTo(
        el,
        { height: 0, opacity: 0 },
        { height, opacity: 1, duration: 0.3, ease: "power2.out", clearProps: "height" },
      );
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.22, ease: "power2.in" });
    }
  }, [expanded]);

  return (
    <div
      ref={cardRef}
      className="opacity-0 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
      role="region"
      aria-label={`Pre-Session Brief for ${brief.sessionCourse}`}
    >
      {/* Header bar */}
      <div
        className={`px-4 py-2 flex items-center gap-2 text-[11px] font-medium ${
          isImminent
            ? "bg-amber-50 border-b border-amber-100 text-amber-700"
            : "bg-slate-50 border-b border-slate-100 text-slate-500"
        }`}
      >
        <Clock size={11} strokeWidth={2.5} />
        <span>
          {isImminent ? "Starting soon —" : "In"} {formatCountdown(minsLeft)}{" "}
          {isImminent ? "get ready" : "away"}
        </span>
        <span className="ml-auto font-mono text-[10px] tracking-wide opacity-60">
          Quest BRIEF
        </span>
      </div>

      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left group hover:bg-slate-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-inset"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md bg-slate-900">
            <MentrixaVocabIcon name="brief" size={18} className="text-white" title="Pre-session brief" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 leading-snug truncate">
              {brief.sessionCourse}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Session brief · {brief.likelyCoverage.length} topic
              {brief.likelyCoverage.length !== 1 ? "s" : ""} · warm-up included
            </p>
          </div>
        </div>

        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expandable body */}
      <div
        ref={bodyRef}
        className="overflow-hidden"
        style={{ height: 0, opacity: 0 }}
        aria-hidden={!expanded}
      >
        <div className="px-4 pb-5 pt-1 space-y-5">
          {/* What you'll cover */}
          {brief.likelyCoverage.length > 0 && (
            <section>
              <SectionLabel
                icon={Brain}
                label="What you'll likely cover today"
                color="text-blue-500"
              />
              <BulletList items={brief.likelyCoverage} />
            </section>
          )}

          {/* Weak spots */}
          {brief.weakSpotsToWatch.length > 0 && (
            <section>
              <SectionLabel
                icon={AlertTriangle}
                label="Your weak spots to watch"
                color="text-amber-500"
              />
              <BulletList items={brief.weakSpotsToWatch} muted />
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Based on your recent Quest practice patterns.
              </p>
            </section>
          )}

          {/* Warm-up exercise */}
          {brief.warmUpExercise.prompt && (
            <section>
              <SectionLabel
                vocabIcon="quest"
                label={`Warm-up · ${brief.warmUpExercise.title}`}
                color="text-emerald-500"
              />
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3.5 py-3">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {brief.warmUpExercise.prompt}
                </p>
                {brief.warmUpExercise.hint && (
                  <div className="mt-2.5">
                    {warmUpRevealed ? (
                      <p className="text-xs text-slate-500 italic leading-relaxed">
                        Hint: {brief.warmUpExercise.hint}
                      </p>
                    ) : (
                      <button
                        onClick={() => setWarmUpRevealed(true)}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors duration-150 underline underline-offset-2"
                      >
                        Show hint
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Try this before your session starts — 2 minutes.
              </p>
            </section>
          )}

          {/* Questions to ask */}
          {brief.questionsToAsk.length > 0 && (
            <section>
              <SectionLabel
                icon={MessageSquare}
                label="Questions to ask your Guide"
                color="text-violet-500"
              />
              <ol className="space-y-2 pl-0 list-none">
                {brief.questionsToAsk.map((q, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="shrink-0 mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-sm bg-slate-100 text-[10px] font-semibold text-slate-500 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 leading-relaxed">&ldquo;{q}&rdquo;</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hub notification strip (compact) ────────────────────────────────────────

/**
 * Compact strip shown at the top of the student hub when a brief is ready.
 * Links to the full card below.
 */
export function PreSessionBriefStrip({
  course,
  sessionStartTime,
  onClick,
}: {
  course: string;
  sessionStartTime: string;
  onClick?: () => void;
}) {
  const minsLeft = minutesUntil(sessionStartTime);
  const stripRef = useRef<HTMLDivElement>(null);

  useGsapEffect((gsap) => {
    if (!stripRef.current) return;
    gsap.fromTo(
      stripRef.current,
      { opacity: 0, x: -8 },
      { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" },
    );
  }, []);

  return (
    <div ref={stripRef} className="opacity-0">
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 transition-colors duration-150 group shadow-sm"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
          <Brain size={13} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate">
            Your {course} session starts in {formatCountdown(minsLeft)} — see your brief
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Topics, warm-up, and questions ready
          </p>
        </div>
        <ChevronDown
          size={13}
          className="shrink-0 text-slate-400 -rotate-90 group-hover:translate-x-0.5 transition-transform duration-150"
        />
      </button>
    </div>
  );
}
