"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/shared/core/utils";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import {
  masteryStatusColor,
  masteryStatusLabel,
  masteryBarColor,
  type SubjectEntry,
  type KnowledgeNode,
  type NextStepRecommendation,
} from "@/features/learning-path/knowledge-graph-lib";
import { SkillTree } from "@/features/learning-path/ui/skill-tree";
import { SubjectProgressRing } from "@/features/learning-path/ui/subject-progress-ring";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { Typewriter } from "@/shared/ui/typewriter";
import { TiltCard } from "@/shared/ui/tilt-card";
import { BackButton } from "@/shared/ui/back-button";

interface Props {
  nodes: KnowledgeNode[];
  tree: SubjectEntry[];
  recommendations: NextStepRecommendation[];
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
        <Image src="/images/book.webp" alt="Book" width={20} height={20} className="opacity-80" />
      </div>
      <h2 className="text-sm font-medium text-slate-800">No learning data yet</h2>
      <p className="mt-1.5 max-w-xs text-sm text-slate-600 leading-relaxed">
        Complete your first quest to start your map.
      </p>
      <Link
        href="/student/quest"
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-indigo-500"
      >
        <Image src="/images/quest.webp" alt="Quest" width={14} height={14} />
        Start a Quest
      </Link>
    </div>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────

const REASON_LABELS: Record<NextStepRecommendation["reason"], string> = {
  almost_mastered: "Almost there",
  new_territory: "New territory",
};

const REASON_COLORS: Record<NextStepRecommendation["reason"], string> = {
  almost_mastered: "bg-indigo-50 text-indigo-700 border-indigo-100",
  new_territory: "bg-violet-50 text-violet-700 border-violet-100",
};

function RecommendationCard({ rec }: { rec: NextStepRecommendation }) {
  const pct = rec.masteryScore;
  const status = pct >= 80 ? "proficient" : pct >= 40 ? "learning" : "locked" as const;

  return (
    <TiltCard tiltLimit={5} scale={1.02} className={cn("group flex flex-col gap-2.5 rounded-2xl border bg-white p-4 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1")}>
      <Link href="/student/quest" className="flex flex-col gap-2.5 w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{rec.subtopic}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{rec.subject}</p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${REASON_COLORS[rec.reason]}`}
        >
          {REASON_LABELS[rec.reason]}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className={masteryStatusColor(status)}>{masteryStatusLabel(status)}</span>
          <span className="tabular-nums text-slate-500">{pct}/100</span>
        </div>
        <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${masteryBarColor(status)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Go practice</span>
        <Image
          src="/images/quest.webp"
          alt="Go"
          width={13}
          height={13}
          className="opacity-70 transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </div>
      </Link>
    </TiltCard>
  );
}

function BouncingMentrixer() {
  const boxRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const icon = iconRef.current;
    if (!box || !icon) return;

    let raf = 0;
    const iconSize = 26;
    let x = 8 + Math.random() * 40;
    let y = 8 + Math.random() * 22;
    let vx = (Math.random() > 0.5 ? 1 : -1) * (1.4 + Math.random() * 0.8);
    let vy = (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 0.8);
    let angle = Math.random() * 360;
    let vr = (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 1.3);

    const tick = () => {
      const maxX = Math.max(0, box.clientWidth - iconSize);
      const maxY = Math.max(0, box.clientHeight - iconSize);

      x += vx;
      y += vy;
      angle += vr;

      if (x <= 0) {
        x = 0;
        vx = Math.abs(vx);
        vr = -vr * 0.98;
      } else if (x >= maxX) {
        x = maxX;
        vx = -Math.abs(vx);
        vr = -vr * 0.98;
      }

      if (y <= 0) {
        y = 0;
        vy = Math.abs(vy);
        vr = -vr * 0.98;
      } else if (y >= maxY) {
        y = maxY;
        vy = -Math.abs(vy);
        vr = -vr * 0.98;
      }

      icon.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={boxRef}
      className="relative h-14 overflow-hidden rounded-md border border-slate-200 bg-white/70"
      aria-hidden
    >
      <div ref={iconRef} className="absolute left-0 top-0 will-change-transform">
        <Image src={MENTRIXA_LOGO_PNG} alt="" width={26} height={26} className="opacity-90" />
      </div>
    </div>
  );
}

// ─── Topic accordion row ──────────────────────────────────────────────────────

function TopicRow({ topic }: { topic: SubjectEntry["topics"][number] }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) {
      gsap.set(el, { height: "auto" });
      const h = el.scrollHeight;
      gsap.fromTo(el, { height: 0 }, { height: h, duration: 0.22, ease: "power2.out", clearProps: "height" });
    } else {
      gsap.to(el, { height: 0, duration: 0.18, ease: "power2.in" });
    }
  }, [open]);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors duration-150"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span className="text-sm font-medium text-slate-800 truncate">{topic.topic}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-20 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${masteryBarColor(topic.status)}`}
                style={{ width: `${topic.avgMastery}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-slate-500 w-8 text-right">
              {topic.avgMastery}%
            </span>
          </div>
          <Image
            src="/images/pending.webp"
            alt="Toggle"
            width={13}
            height={13}
            className={`opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <div ref={bodyRef} className="overflow-hidden" style={{ height: 0 }}>
        <div className="px-4 pb-3 pt-1 space-y-2">
          {topic.subtopics.map((sub) => (
            <div
              key={sub.subtopic}
              className="flex items-center gap-3 rounded-md px-3 py-2 bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-700 truncate">{sub.subtopic}</p>
                <p className={`text-[10px] mt-0.5 ${masteryStatusColor(sub.status)}`}>
                  {masteryStatusLabel(sub.status)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${masteryBarColor(sub.status)}`}
                    style={{ width: `${sub.masteryScore}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-slate-500 w-7 text-right">
                  {sub.masteryScore}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Subject panel ────────────────────────────────────────────────────────────

function SubjectPanel({ subject }: { subject: SubjectEntry }) {
  return (
    <TiltCard className={`${mentrixStudent.card} overflow-hidden rounded-lg`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{subject.subject}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {subject.masteredSubtopics}/{subject.totalSubtopics} subtopics mastered
          </p>
        </div>
        <span className={`text-xs font-medium tabular-nums ${masteryStatusColor(subject.status)}`}>
          {subject.avgMastery}%
        </span>
      </div>
      <div>
        {subject.topics.map((topic) => (
          <TopicRow key={topic.topic} topic={topic} />
        ))}
      </div>
    </TiltCard>
  );
}

// ─── Stats strip ─────────────────────────────────────────────────────────────

function StatsStrip({ nodes }: { nodes: KnowledgeNode[] }) {
  const total = nodes.length;
  const mastered = nodes.filter((n) => n.masteryScore >= 90).length;
  const learning = nodes.filter((n) => n.masteryScore > 0 && n.masteryScore < 90).length;
  const avgMastery =
    total > 0
      ? Math.round(nodes.reduce((s, n) => s + n.masteryScore, 0) / total)
      : 0;

  const stats = [
    { label: "Subtopics tracked", value: total.toString() },
    { label: "Mastered", value: mastered.toString() },
    { label: "In progress", value: learning.toString() },
    { label: "Avg mastery", value: `${avgMastery}%` },
  ];

  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stripRef.current) return;
    const cells = stripRef.current.querySelectorAll(".stat-cell");
    gsap.fromTo(
      cells,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: "power2.out", delay: 0.1 }
    );
  }, []);

  return (
    <div
      ref={stripRef}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="stat-cell flex flex-col rounded-md border border-slate-200/90 bg-white px-4 py-3 opacity-0 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)]"
        >
          <span className="text-xl font-bold tabular-nums text-indigo-600">{s.value}</span>
          <div className="flex items-center gap-1 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function LearningPathClient({ nodes, tree, recommendations }: Props) {
  const [activeSubject, setActiveSubject] = useState<string | null>(
    tree[0]?.subject ?? null
  );

  const activeSubjectData = tree.find((s) => s.subject === activeSubject) ?? null;

  if (tree.length === 0) {
    return (
      <div className={mentrixStudent.pageBg}>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mb-6">
            <p className={mentrixStudent.sectionEyebrow}>Mastery tree</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 h-[32px]">
              <Typewriter text="Learning path" speed={70} waitTime={8000} />
            </h1>
          </div>
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className={mentrixStudent.pageBg}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={mentrixStudent.sectionEyebrow}>Forge your arc</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl h-[36px]">
              <Typewriter text="Learning path" speed={70} waitTime={8000} />
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Track mastery.</p>
          </div>
          <Link
            href="/student/quest"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
          >
          
            Adaptive quest
          </Link>
        </div>

        {/* Stats strip */}
        <StatsStrip nodes={nodes} />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: skill tree + subject list */}
          <div className="lg:col-span-2 space-y-6">

            {/* Skill tree visualisation */}
            <TiltCard tiltLimit={3} className={`${mentrixStudent.card} overflow-hidden ring-1 ring-indigo-100/80`}>
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">Skill map</p>
              </div>
              <div className="p-4">
                <SkillTree
                  tree={tree}
                  activeSubject={activeSubject}
                  onSubjectSelect={setActiveSubject}
                />
              </div>
            </TiltCard>

            {/* Subject selector tabs */}
            {tree.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {tree.map((s) => (
                  <button
                    key={s.subject}
                    onClick={() => setActiveSubject(s.subject)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                      activeSubject === s.subject
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                        : "border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    {s.subject}
                    <span
                      className={`tabular-nums ${activeSubject === s.subject ? "text-slate-300" : "text-slate-400"}`}
                    >
                      {s.avgMastery}%
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Active subject detail */}
            {activeSubjectData && (
              <SubjectPanel subject={activeSubjectData} />
            )}
          </div>

          {/* Right: progress rings + recommendations */}
          <div className="space-y-6">

            {/* Subject progress rings */}
            <TiltCard tiltLimit={5} className={`${mentrixStudent.card} p-4`}>
              <p className="mb-4 text-sm font-semibold text-slate-800">By subject</p>
              <div className="space-y-4">
                {tree.map((s) => (
                  <SubjectProgressRing
                    key={s.subject}
                    subject={s.subject}
                    mastery={s.avgMastery}
                    mastered={s.masteredSubtopics}
                    total={s.totalSubtopics}
                    status={s.status}
                    onClick={() => setActiveSubject(s.subject)}
                    active={activeSubject === s.subject}
                  />
                ))}
              </div>
            </TiltCard>

            {/* Recommended next steps */}
            {recommendations.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Image src="/images/xp.webp" alt="Trend" width={13} height={13} className="opacity-80" />
                  <p className="text-sm font-medium text-slate-800">Next steps</p>
                </div>
                <BouncingMentrixer />
                <div className="mt-3 space-y-2">
                  {recommendations.map((rec, i) => (
                    <RecommendationCard key={i} rec={rec} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
