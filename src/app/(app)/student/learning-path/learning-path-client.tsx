"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { BookOpen, Zap, ArrowRight, ChevronDown, TrendingUp } from "lucide-react";
import {
  masteryStatusColor,
  masteryStatusLabel,
  masteryBarColor,
  estimatedSessionsToMastery,
  type SubjectEntry,
  type KnowledgeNode,
  type NextStepRecommendation,
} from "@/lib/knowledge-graph";
import { SkillTree } from "@/components/learning/skill-tree";
import { SubjectProgressRing } from "@/components/learning/subject-progress-ring";

interface Props {
  nodes: KnowledgeNode[];
  tree: SubjectEntry[];
  recommendations: NextStepRecommendation[];
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
        <BookOpen size={20} className="text-slate-500" />
      </div>
      <h2 className="text-sm font-medium text-slate-900">No learning data yet</h2>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500 leading-relaxed">
        Complete your first Quest to start building your personalised knowledge map.
      </p>
      <Link
        href="/student/quest"
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
      >
        Start a Quest
        <ArrowRight size={13} strokeWidth={2.5} />
      </Link>
    </div>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────

const REASON_LABELS: Record<NextStepRecommendation["reason"], string> = {
  weakest: "Needs work",
  almost_mastered: "Almost there",
  new_territory: "New territory",
};

const REASON_COLORS: Record<NextStepRecommendation["reason"], string> = {
  weakest: "bg-red-50 text-red-700 border-red-100",
  almost_mastered: "bg-blue-50 text-blue-700 border-blue-100",
  new_territory: "bg-violet-50 text-violet-700 border-violet-100",
};

function RecommendationCard({ rec }: { rec: NextStepRecommendation }) {
  const pct = rec.masteryScore;
  const status = pct >= 80 ? "proficient" : pct >= 40 ? "learning" : "locked" as const;

  return (
    <Link
      href="/student/quest"
      className="group flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{rec.subtopic}</p>
          <p className="text-xs text-slate-500 mt-0.5">{rec.topic} · {rec.subject}</p>
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
        <span className="text-xs text-slate-500">
          ~{estimatedSessionsToMastery(pct)} session{estimatedSessionsToMastery(pct) !== 1 ? "s" : ""} to mastery
        </span>
        <ArrowRight
          size={12}
          className="text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
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
          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{subject.subject}</p>
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
    </div>
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
      className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-lg border border-slate-200 bg-slate-200 overflow-hidden"
    >
      {stats.map((s) => (
        <div key={s.label} className="stat-cell flex flex-col bg-white px-4 py-3 opacity-0">
          <span className="text-xl font-medium tabular-nums text-slate-900">{s.value}</span>
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {s.label}
          </span>
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
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-base font-medium text-slate-900">Learning Path</h1>
            <p className="mt-1 text-sm text-slate-500">
              Your personalised skill map — built from every Quest you complete.
            </p>
          </div>
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-medium text-slate-900">Learning Path</h1>
            <p className="mt-1 text-sm text-slate-500">
              Your personalised skill map — updated after every Quest.
            </p>
          </div>
          <Link
            href="/student/quest"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 transition-colors duration-150"
          >
            <Zap size={11} strokeWidth={2.5} />
            Adaptive Quest
          </Link>
        </div>

        {/* Stats strip */}
        <StatsStrip nodes={nodes} />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: skill tree + subject list */}
          <div className="lg:col-span-2 space-y-6">

            {/* Skill tree visualisation */}
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">Skill Map</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nodes = subtopics · Colour = mastery level
                </p>
              </div>
              <div className="p-4">
                <SkillTree
                  tree={tree}
                  activeSubject={activeSubject}
                  onSubjectSelect={setActiveSubject}
                />
              </div>
            </div>

            {/* Subject selector tabs */}
            {tree.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {tree.map((s) => (
                  <button
                    key={s.subject}
                    onClick={() => setActiveSubject(s.subject)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                      activeSubject === s.subject
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
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
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900 mb-4">By subject</p>
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
            </div>

            {/* Recommended next steps */}
            {recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={13} className="text-slate-500" />
                  <p className="text-sm font-medium text-slate-900">Recommended next steps</p>
                </div>
                <div className="space-y-2">
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
