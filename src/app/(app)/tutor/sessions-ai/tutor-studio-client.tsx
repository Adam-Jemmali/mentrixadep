"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { runGsapAction, useGsapEffect } from "@/shared/core/gsap-lazy";
import { deleteStudioPackage, publishStudioPackage, saveStudioPackageDraft, type TutorSessionWithPackage } from "@/features/studio-ai/studio-packages";
import { StudioSessionMasteryPanel } from "@/features/studio-ai/studio-session-mastery-panel";
import { formatStudioRetestConfirmationLine } from "@/features/breakthrough-events/schedule-session-retests-pure";
import { useAdminViewContext } from "@/components/admin-view-context";
import type { SessionAiPackage } from "@/shared/types/database";
import { formatDate } from "@/shared/core/time-format";
import { CourseTagChip } from "@/shared/ui/chip-patterns";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { MentrixaTabsGroup } from "@/shared/ui/tabs-patterns";
import { studioFilterTabMessage, studioFilterTabsAriaLabel } from "@/shared/ui/tabs-messages-pure";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/radix-select";
import { Loader2, MessageSquare, Save, Send, CheckCircle2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { Typewriter } from "@/shared/ui/typewriter";
import { ParticleTextEffect } from "@/shared/ui/particle-text-effect";
import { STUDIO_LOOP } from "@/features/studio-ai/studio-loop-copy-pure";

const STREAM_END = "\n__MENTRIXA_STUDIO_END__";

const playClickSound = () => {
  if (typeof window === "undefined") return;
  try {
     
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (_e) {}
};

const playTypeSound = () => {
  if (typeof window === "undefined") return;
  try {
     
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (_e) {}
};

type PackageFilter = "all" | "generated" | "pending";
type StudioSort = "newest" | "oldest" | "student_az" | "course_az";

type DraftEdit = {
  summary: string;
  key_points: string[];
  flashcards: { q: string; a: string }[];
  practice_exercises: { title: string; prompt: string; hint?: string }[];
  follow_up_topics: string[];
  followup_quests: { prompt: string; difficulty: string }[];
};

function pkgToDraft(pkg: SessionAiPackage): DraftEdit {
  return {
    summary: pkg.summary ?? "",
    key_points: [...(pkg.key_points ?? [])],
    flashcards: (pkg.flashcards ?? []).map((f) => ({ q: f.q, a: f.a })),
    practice_exercises: (pkg.practice_exercises ?? []).map((e) => ({
      title: e.title,
      prompt: e.prompt,
      hint: e.hint,
    })),
    follow_up_topics: [...(pkg.follow_up_topics ?? [])],
    followup_quests: (pkg.followup_quests ?? []).map((q) => ({
      prompt: q.prompt,
      difficulty: q.difficulty ?? "medium",
    })),
  };
}

export function TutorStudioClient({
  sessions,
}: {
  sessions: TutorSessionWithPackage[];
}) {
  const [rows, setRows] = useState(sessions);
  const [query, setQuery] = useState("");
  const [packageFilter, setPackageFilter] = useState<PackageFilter>("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [sortBy, setSortBy] = useState<StudioSort>("newest");
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [closingRowId, setClosingRowId] = useState<string | null>(null);
  const [contextBySession, setContextBySession] = useState<Record<string, string>>({});
  const [streamPreviewBySession, setStreamPreviewBySession] = useState<Record<string, string>>(
    {},
  );
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [errorByRow, setErrorByRow] = useState<Record<string, string>>({});
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [retestConfirmBySession, setRetestConfirmBySession] = useState<Record<string, string>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { viewingAsUserId } = useAdminViewContext();
  const router = useRouter();
  const expandedRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    setRows(sessions);
  }, [sessions]);

  const courses = useMemo(
    () => Array.from(new Set(rows.map((row) => row.course))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const students = useMemo(() => {
    const labels = rows.map((row) =>
      row.student_display_name?.trim() ||
      row.student_email ||
      (row.student_id ? `${row.student_id.slice(0, 8)}…` : "—"),
    );
    return Array.from(new Set(labels)).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = rows.filter((row) => {
      const hasPkg = row.aiPackage !== null;
      const published = Boolean(row.aiPackage?.package_published_at);
      if (packageFilter === "generated" && (!hasPkg || !published)) return false;
      if (packageFilter === "pending" && hasPkg) return false;
      if (courseFilter !== "all" && row.course !== courseFilter) return false;
      const learnerLabel =
        row.student_display_name?.trim() ||
        row.student_email ||
        (row.student_id ? `${row.student_id.slice(0, 8)}…` : "—");
      if (studentFilter !== "all" && learnerLabel !== studentFilter) return false;
      if (!q) return true;
      const name = (row.student_display_name ?? "").toLowerCase();
      const learner = (row.student_email ?? row.student_id ?? "").toLowerCase();
      const courseStr = (row.course ?? "").toLowerCase();
      return courseStr.includes(q) || learner.includes(q) || name.includes(q);
    });

    const sorted = [...base];
    sorted.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      }
      if (sortBy === "student_az") {
        const aLabel = (a.student_display_name?.trim() || a.student_email || "").toLowerCase();
        const bLabel = (b.student_display_name?.trim() || b.student_email || "").toLowerCase();
        return aLabel.localeCompare(bLabel);
      }
      return a.course.localeCompare(b.course);
    });
    return sorted;
  }, [rows, query, packageFilter, courseFilter, studentFilter, sortBy]);

  useGsapEffect((gsap) => {
    if (!openRowId || !expandedRowRef.current) return;
    gsap.from(expandedRowRef.current, {
      height: 0,
      opacity: 0,
      duration: 0.3,
      ease: "power2.out",
    });
  }, [openRowId]);

  const publishedCount = useMemo(
    () => rows.filter((row) => row.aiPackage?.package_published_at).length,
    [rows],
  );

  const closeExpanded = () => {
    if (!openRowId || !expandedRowRef.current) {
      setOpenRowId(null);
      return;
    }
    const rowId = openRowId;
    setClosingRowId(rowId);
    runGsapAction((gsap) => {
      gsap.to(expandedRowRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          setClosingRowId(null);
          setOpenRowId((current) => (current === rowId ? null : current));
        },
      });
    });
  };

  const toggleExpanded = (sessionId: string) => {
    if (openRowId === sessionId) {
      closeExpanded();
      return;
    }
    setOpenRowId(sessionId);
  };

  const toggleCardFlip = (cardKey: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardKey)) next.delete(cardKey);
      else next.add(cardKey);
      return next;
    });
  };

  async function runStreamRequest(
    sessionId: string,
    isRegenerate: boolean,
  ): Promise<{ ok: true } | { error: string }> {
    setStreamingId(sessionId);
    setErrorByRow((prev) => ({ ...prev, [sessionId]: "" }));
    setStreamPreviewBySession((prev) => ({ ...prev, [sessionId]: "" }));

    const tutorContext = contextBySession[sessionId]?.trim() || undefined;

    try {
      const res = await fetch("/api/tutor/studio-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tutorContext,
          onBehalfOfTutorId: viewingAsUserId ?? undefined,
          isRegenerate,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg =
          typeof errJson.error === "string" ? errJson.error : `Request failed (${res.status})`;
        return { error: msg };
      }

      const reader = res.body?.getReader();
      if (!reader) {
        return { error: "No response stream" };
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const cut = buffer.indexOf(STREAM_END);
        if (cut >= 0) {
          setStreamPreviewBySession((prev) => ({
            ...prev,
            [sessionId]: buffer.slice(0, cut),
          }));
          const metaRaw = buffer.slice(cut + STREAM_END.length);
          try {
            const meta = JSON.parse(metaRaw) as { ok?: boolean; error?: string };
            if (!meta.ok) {
              return { error: meta.error ?? "Generation failed" };
            }
          } catch {
            return { error: "Invalid response from server" };
          }
          break;
        }
        setStreamPreviewBySession((prev) => ({ ...prev, [sessionId]: buffer }));
      }

      router.refresh();
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Generation failed" };
    } finally {
      setStreamingId(null);
    }
  }

  const handleGenerate = async (sessionId: string) => {
    const result = await runStreamRequest(sessionId, false);
    if ("error" in result) {
      setErrorByRow((prev) => ({ ...prev, [sessionId]: result.error }));
      return;
    }
    setOpenRowId(sessionId);
  };

  const handleRegenerate = async (sessionId: string) => {
    const result = await runStreamRequest(sessionId, true);
    if ("error" in result) {
      setErrorByRow((prev) => ({ ...prev, [sessionId]: result.error }));
    }
  };

  const handleRemoveStudioRow = async (sessionId: string) => {
    const ok = window.confirm(
      "Remove this row from Studio? Any draft or published package will be deleted and the session will disappear from this list. Your learner will lose access to a published package until you generate and publish a new one.",
    );
    if (!ok) return;

    setRemovingId(sessionId);
    setErrorByRow((prev) => ({ ...prev, [sessionId]: "" }));
    const res = await deleteStudioPackage(sessionId, viewingAsUserId ?? undefined);
    setRemovingId(null);

    if ("error" in res) {
      setErrorByRow((prev) => ({ ...prev, [sessionId]: res.error }));
      return;
    }

    setOpenRowId((current) => (current === sessionId ? null : current));
    setRows((prev) => prev.filter((row) => row.id !== sessionId));
    router.refresh();
  };

  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
        No sessions found.
      </div>
    );
  }

  return (
    <section className={`${mentrixStudent.card} relative overflow-hidden px-4 py-5 md:px-5`}>
      <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-indigo-500/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
      <header className="relative mb-6 flex flex-col items-center gap-5 border-b border-indigo-100 pb-6 md:grid md:grid-cols-[1fr_auto_1fr] md:items-end">
        <div className="flex w-full items-center gap-4 md:justify-start">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50">
            <Image src="/icons/guide.svg" alt="" width={28} height={28} className="opacity-90" />
          </div>
          <div className="space-y-1 text-left">
            <div className="h-5 overflow-hidden">
              <Typewriter
                text="Mentrixa Studio"
                speed={65}
                waitTime={7000}
                className="text-[10px] font-black uppercase tracking-[0.32em] text-indigo-500"
              />
            </div>
          </div>
        </div>
        <div className="h-[62px] w-[320px] max-w-[78vw]">
          <ParticleTextEffect
            words={["STUDIO SESSIONS"]}
            tone="onLight"
            className="h-full w-full"
          />
        </div>
        <div className="flex w-full justify-center gap-10 text-center md:justify-end md:text-right">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Published</p>
            <p className="text-4xl font-black italic tracking-tighter text-indigo-700">{publishedCount}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Past Sessions</p>
            <p className="text-4xl font-black italic tracking-tighter text-violet-600">{rows.length}</p>
          </div>
        </div>
      </header>

      <div className="relative mb-6 rounded-2xl border border-indigo-100 bg-[linear-gradient(180deg,rgba(238,242,255,0.65)_0%,rgba(255,255,255,1)_100%)] px-4 py-4 shadow-[0_10px_30px_-24px_rgba(79,70,229,0.6)]">
        <div className="space-y-3">
          <MentrixaTabsGroup
            ariaLabel={studioFilterTabsAriaLabel()}
            tone="workbench"
            variant="secondary"
            selectedKey={packageFilter}
            onSelectionChange={(key) => setPackageFilter(key as PackageFilter)}
            brandKind="guide"
            suppressPanelFooter
            panelClassName="hidden"
            listClassName="w-full sm:w-auto"
            items={(["all", "generated", "pending"] as const).map((id) => ({
              id,
              ...studioFilterTabMessage(id),
              panel: <span className="sr-only">{studioFilterTabMessage(id).label}</span>,
            }))}
          />
          <p className="text-xs leading-relaxed text-slate-600">
            {studioFilterTabMessage(packageFilter).verdict}{" "}
            {studioFilterTabMessage(packageFilter).nextAction}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by skill or learner…"
            className="h-10 min-w-[220px] flex-1 border-indigo-100 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:ring-indigo-200"
          />

          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="h-10 w-[170px] border-indigo-100 bg-white text-xs text-slate-700 focus-visible:border-indigo-300 focus-visible:ring-indigo-200">
              <SelectValue placeholder="Skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All skills</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course} value={course}>
                  {course}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={studentFilter} onValueChange={setStudentFilter}>
            <SelectTrigger className="h-10 w-[190px] border-indigo-100 bg-white text-xs text-slate-700 focus-visible:border-indigo-300 focus-visible:ring-indigo-200">
              <SelectValue placeholder="Learner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All learners</SelectItem>
              {students.map((student) => (
                <SelectItem key={student} value={student}>
                  {student}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as StudioSort)}>
            <SelectTrigger className="h-10 w-[180px] border-indigo-100 bg-white text-xs text-slate-700 focus-visible:border-indigo-300 focus-visible:ring-indigo-200">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest sessions</SelectItem>
              <SelectItem value="oldest">Oldest sessions</SelectItem>
              <SelectItem value="student_az">Learner A to Z</SelectItem>
              <SelectItem value="course_az">Skill A to Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-indigo-100/90 bg-white shadow-[0_16px_48px_-34px_rgba(67,56,202,0.55)]">
        <table className="min-w-full text-xs">
          <thead className="border-b border-indigo-100 bg-[linear-gradient(180deg,rgba(238,242,255,0.85)_0%,rgba(255,255,255,1)_100%)] text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700">
                <span className="inline-flex items-center gap-1.5">
                  <MentrixaVocabIcon name="skills" size={14} title="Skill" />
                  Skill
                </span>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700">
                <span className="inline-flex items-center gap-1.5">
                  <MentrixaVocabIcon name="profile" size={14} title="Learner" />
                  Learner
                </span>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700">Date</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700">Duration</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700">
                <span className="inline-flex items-center gap-1.5">
                  <MentrixaVocabIcon name="guide-session" size={14} title="Studio" />
                  Studio
                </span>
              </th>
              <th className="min-w-[260px] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700">Action</th>
            </tr>
          </thead>
          <tbody>
          {filteredRows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                No sessions match your filters.
              </td>
            </tr>
          )}

          {filteredRows.map((session) => {
            const pkg = session.aiPackage;
            const hasPackage = pkg !== null;
            const published = Boolean(pkg?.package_published_at);
            const isStreaming = streamingId === session.id;
            const isOpen = openRowId === session.id;
            const isClosing = closingRowId === session.id;
            const learnerLabel =
              session.student_display_name?.trim() ||
              session.student_email ||
              (session.student_id ? `${session.student_id.slice(0, 8)}…` : "—");
            const regenUsed = pkg?.studio_regenerate_count ?? 0;
            const regenLeft = Math.max(0, 3 - regenUsed);

            return (
              <Fragment key={session.id}>
                <tr
                  className="studio-row mentrixa-interactive border-b border-indigo-50/90 transition-colors hover:bg-indigo-50/30"
                  onClick={() => {
                    if (hasPackage) toggleExpanded(session.id);
                  }}
                >
                  <td className="px-4 py-3 align-middle">
                    <CourseTagChip course={session.course} />
                  </td>
                  <td className="px-4 py-3 align-middle text-sm font-bold text-slate-900">{learnerLabel}</td>
                  <td className="px-4 py-3 align-middle text-sm text-slate-600">{formatDate(session.start_time)}</td>
                  <td className="px-4 py-3 align-middle font-mono text-xs text-slate-500">
                    {getDurationLabel(session.start_time, session.end_time)}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {!hasPackage ? (
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-500">None</span>
                    ) : published ? (
                      <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[11px] text-indigo-700">Published</span>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[11px] text-amber-700">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                      {!hasPackage ? (
                        <>
                          <Textarea
                            placeholder="Optional: what you covered, where they struggled…"
                            value={contextBySession[session.id] ?? ""}
                            onChange={(e) =>
                              setContextBySession((prev) => ({
                                ...prev,
                                [session.id]: e.target.value,
                              }))
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="min-h-[56px] max-w-[280px] resize-y border-indigo-100 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:ring-indigo-200"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={isStreaming}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleGenerate(session.id);
                              }}
                              className="h-8 shrink-0 border-0 bg-indigo-600 text-xs text-white hover:bg-indigo-500"
                            >
                              {isStreaming ? (
                                <>
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  Generating…
                                </>
                              ) : (
                                "Generate study package"
                              )}
                            </Button>
                            <button
                              type="button"
                              disabled={removingId === session.id || isStreaming}
                              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRemoveStudioRow(session.id);
                              }}
                              title="Remove this session from Studio"
                            >
                              {removingId === session.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              )}
                              Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="text-left text-xs font-medium text-indigo-700 hover:text-indigo-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(session.id);
                            }}
                          >
                            {isOpen ? "Close" : published ? "View / edit" : "Review draft"}
                          </button>
                          <button
                            type="button"
                            disabled={removingId === session.id}
                            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleRemoveStudioRow(session.id);
                            }}
                            title="Remove this row from Studio"
                          >
                            {removingId === session.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            )}
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>

                {isStreaming && streamPreviewBySession[session.id] ? (
                  <tr>
                    <td colSpan={6} className="border-b border-indigo-100 bg-indigo-50/40 px-4 py-3">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-indigo-500">
                        Model output (streaming preview)
                      </p>
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-indigo-100 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-700">
                        {streamPreviewBySession[session.id]}
                      </pre>
                    </td>
                  </tr>
                ) : null}

                {(isOpen || isClosing) && hasPackage && pkg ? (
                  <tr ref={expandedRowRef}>
                    <td colSpan={6} className="border-b border-slate-200 bg-slate-50/50">
                      <SessionPackageEditor
                        sessionId={session.id}
                        course={session.course}
                        learnerName={
                          session.student_display_name?.trim() ||
                          session.student_email?.split("@")[0] ||
                          "the learner"
                        }
                        pkg={pkg}
                        onBehalfOfTutorId={viewingAsUserId ?? undefined}
                        regenLeft={regenLeft}
                        tutorNotes={contextBySession[session.id] ?? ""}
                        onTutorNotesChange={(v: string) =>
                          setContextBySession((prev) => ({ ...prev, [session.id]: v }))
                        }
                        flippedCards={flippedCards}
                        savingId={savingId}
                        publishingId={publishingId}
                        streamingId={streamingId}
                        onToggleCard={toggleCardFlip}
                        onSave={async (draft: DraftEdit) => {
                          setSavingId(session.id);
                          setErrorByRow((prev) => ({ ...prev, [session.id]: "" }));
                          const res = await saveStudioPackageDraft(
                            session.id,
                            {
                              summary: draft.summary || null,
                              key_points: draft.key_points,
                              flashcards: draft.flashcards,
                              practice_exercises: draft.practice_exercises,
                              follow_up_topics: draft.follow_up_topics,
                              followup_quests: draft.followup_quests,
                            },
                            viewingAsUserId ?? undefined,
                          );
                          setSavingId(null);
                          if ("error" in res) {
                            setErrorByRow((prev) => ({ ...prev, [session.id]: res.error }));
                            return;
                          }
                          router.refresh();
                        }}
                        onPublish={async () => {
                          setPublishingId(session.id);
                          setErrorByRow((prev) => ({ ...prev, [session.id]: "" }));
                          const res = await publishStudioPackage(
                            session.id,
                            viewingAsUserId ?? undefined,
                          );
                          setPublishingId(null);
                          if ("error" in res) {
                            setErrorByRow((prev) => ({ ...prev, [session.id]: res.error }));
                            return;
                          }
                          if (res.retestConfirmation) {
                            const line = formatStudioRetestConfirmationLine(
                              res.retestConfirmation.studentDisplayName,
                              res.retestConfirmation.retestScheduledAt,
                              res.retestConfirmation.skillsCovered,
                              (iso) => formatDate(iso),
                            );
                            setRetestConfirmBySession((prev) => ({
                              ...prev,
                              [session.id]: line,
                            }));
                          }
                          router.refresh();
                        }}
                        retestConfirmationLine={retestConfirmBySession[session.id]}
                        onRegenerate={() => void handleRegenerate(session.id)}
                      />
                    </td>
                  </tr>
                ) : null}

                {errorByRow[session.id] ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-xs text-red-600">
                      {errorByRow[session.id]}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 font-mono text-[11px] text-slate-400">
        {publishedCount} published · {rows.length} past sessions
      </p>
    </section>
  );
}

function StudioSection({ 
  title, 
  icon: Icon, 
  children, 
  delay = 0 
}: { 
  title: string; 
  icon: string | React.ElementType; 
  children: React.ReactNode; 
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ delay, duration: 0.4, type: "spring", bounce: 0.3 }}
      className={`${mentrixStudent.card} p-5 overflow-hidden group border-2 border-transparent transition-shadow duration-300 hover:border-blue-100 hover:shadow-[0_20px_25px_-5px_rgb(0_0_0_/_0.1),0_8px_10px_-6px_rgb(0_0_0_/_0.1)]`}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <motion.div 
          whileHover={{ rotate: 15, scale: 1.1 }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white"
        >
          {typeof Icon === "string" ? (
            <Image src={Icon} alt="" width={20} height={20} className="group-hover:invert" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </motion.div>
        <h3 className="text-[13px] font-black uppercase tracking-[0.15em] bg-clip-text text-transparent bg-gradient-to-r from-slate-400 to-slate-500 group-hover:from-blue-600 group-hover:to-blue-400 transition-all duration-300">
          {title}
        </h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.section>
  );
}

function SessionPackageEditor({
  sessionId,
  pkg,
  course,
  learnerName,
  onBehalfOfTutorId,
  savingId,
  publishingId,
  streamingId,
  regenLeft,
  tutorNotes,
  onTutorNotesChange,
  flippedCards,
  onToggleCard,
  onSave,
  onPublish,
  onRegenerate,
  retestConfirmationLine,
}: {
  sessionId: string;
  pkg: SessionAiPackage;
  course: string;
  learnerName: string;
  onBehalfOfTutorId?: string;
  savingId: string | null;
  publishingId: string | null;
  streamingId: string | null;
  regenLeft: number;
  tutorNotes: string;
  onTutorNotesChange: (v: string) => void;
  flippedCards: Set<string>;
  onToggleCard: (key: string) => void;
  onSave: (draft: DraftEdit) => Promise<void>;
  onPublish: () => Promise<void>;
  onRegenerate: () => void;
  retestConfirmationLine?: string;
}) {
  const [draft, setDraft] = useState<DraftEdit>(() => pkgToDraft(pkg));

  useEffect(() => {
    setDraft(pkgToDraft(pkg));
  }, [pkg]);

  const published = Boolean(pkg.package_published_at);
  const busy = savingId === sessionId || publishingId === sessionId;
  const streaming = streamingId === sessionId;

  return (
    <div className="px-4 py-8 md:px-8 md:py-10">
      <div className="mb-10 space-y-6">
        <header className={`${mentrixStudent.heroGradientLite} -mx-4 -mt-8 mb-10 p-8 md:-mx-8 md:-mt-10 md:p-10`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg">
                  <Image src="/icons/guide.svg" alt="" width={24} height={24} className="brightness-0 invert" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Studio Output</h2>
                  <p className="text-xs text-blue-50/80 font-medium mt-0.5">
                    {course} · <span className={published ? "text-blue-200" : "text-amber-200"}>
                      {published ? "Visible to learner" : "Draft Mode"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                className="h-10 px-5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95"
                disabled={busy || streaming}
                onClick={() => {
                  playClickSound();
                  void onSave(draft);
                }}
              >
                {savingId === sessionId ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save edits
              </Button>

              {!published ? (
                <Button
                  type="button"
                  className="h-10 px-6 text-xs font-bold bg-white text-blue-950 hover:bg-blue-50 shadow-xl transition-all hover:scale-105 active:scale-95"
                  disabled={busy || streaming}
                  onClick={() => {
                    playClickSound();
                    void onPublish();
                  }}
                >
                  {publishingId === sessionId ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send to learner
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full border border-blue-400/30">
                  <CheckCircle2 className="h-4 w-4 text-blue-300" />
                  <span className="text-xs font-bold text-blue-50">Published</span>
                </div>
              )}

              <Button
                type="button"
                className={`h-10 px-5 text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                  regenLeft > 0 
                    ? "bg-blue-600 text-white hover:bg-blue-500" 
                    : "bg-slate-800 text-slate-400"
                }`}
                disabled={busy || streaming || regenLeft <= 0}
                onClick={() => {
                  playClickSound();
                  onRegenerate();
                }}
              >
                {streaming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Image src="/icons/mentrixer.svg" alt="" width={16} height={16} className="mr-2" />
                )}
                Regenerate ({regenLeft})
              </Button>
            </div>
          </div>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5 shadow-inner"
        >
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <label className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              {STUDIO_LOOP.guideNotesLabel}
            </label>
          </div>
          <p className="mb-3 text-xs text-blue-800/80">{STUDIO_LOOP.guideNotesHint(learnerName)}</p>
          <Textarea
            value={tutorNotes}
            onChange={(e) => {
              playTypeSound();
              onTutorNotesChange(e.target.value);
            }}
            placeholder={STUDIO_LOOP.guideNotesPlaceholder(learnerName)}
            className="min-h-[80px] text-sm bg-white border-blue-100 focus:border-blue-300 focus:ring-blue-200 transition-all rounded-xl shadow-sm"
          />
        </motion.div>

        <StudioSessionMasteryPanel
          sessionId={sessionId}
          followUpTopics={draft.follow_up_topics}
          published={published}
          onBehalfOfTutorId={onBehalfOfTutorId}
        />

        {retestConfirmationLine ? (
          <p className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-950">
            {retestConfirmationLine}
          </p>
        ) : null}
      </div>

      <div className="mx-auto max-w-2xl space-y-8 pb-20">
        <StudioSection title="Summary" icon="/icons/mentrixer.svg" delay={0.2}>
          <Textarea
            value={draft.summary}
            onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
            className="min-h-[120px] text-sm leading-relaxed border-slate-100 focus:border-blue-300 transition-all rounded-xl"
          />
        </StudioSection>

        <StudioSection title="Key points" icon="/icons/guide.svg" delay={0.3}>
          <div className="space-y-3">
            {draft.key_points.map((point, i) => (
              <motion.div 
                key={i}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Input
                  value={point}
                  onChange={(e) => {
                    const next = [...draft.key_points];
                    next[i] = e.target.value;
                    setDraft((d) => ({ ...d, key_points: next }));
                  }}
                  className="h-10 text-sm border-slate-100 focus:border-blue-300 transition-all rounded-lg"
                />
              </motion.div>
            ))}
          </div>
        </StudioSection>

        <StudioSection title="Flashcards" icon="/icons/mentrixer.svg" delay={0.4}>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {draft.flashcards.map((card, cardIndex) => {
              const cardKey = `${sessionId}-card-${cardIndex}`;
              const isFlipped = flippedCards.has(cardKey);
              return (
                <div key={cardKey} className="w-[240px] flex-shrink-0 space-y-3">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    whileTap={{ scale: 0.95 }}
                    className="card-scene h-[140px] cursor-pointer"
                    onClick={() => {
                      playClickSound();
                      onToggleCard(cardKey);
                    }}
                  >
                    <div className={`card ${isFlipped ? "is-flipped" : ""}`}>
                      <div className="card-face card-face--front bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-100 rounded-2xl shadow-sm flex items-center justify-center p-4">
                        <p className="text-xs font-bold text-center leading-relaxed text-slate-700">
                          {card.q}
                        </p>
                        <div className="absolute bottom-2 right-3">
                          <Image src="/icons/guide.svg" alt="" width={12} height={12} className="opacity-40" />
                        </div>
                      </div>
                      <div className="card-face card-face--back bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-100 rounded-2xl shadow-sm flex items-center justify-center p-4">
                        <p className="text-xs font-bold text-center leading-relaxed text-slate-700">
                          {card.a}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  <div className="space-y-2 px-1">
                    <Input
                      className="h-9 text-[11px] border-slate-100 focus:border-blue-300 rounded-lg"
                      value={card.q}
                      onChange={(e) => {
                        const next = [...draft.flashcards];
                        const cur = next[cardIndex] ?? { q: "", a: "" };
                        next[cardIndex] = { q: e.target.value, a: cur.a };
                        setDraft((d) => ({ ...d, flashcards: next }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Input
                      className="h-9 text-[11px] border-slate-100 focus:border-blue-300 rounded-lg"
                      value={card.a}
                      onChange={(e) => {
                        const next = [...draft.flashcards];
                        const cur = next[cardIndex] ?? { q: "", a: "" };
                        next[cardIndex] = { q: cur.q, a: e.target.value };
                        setDraft((d) => ({ ...d, flashcards: next }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </StudioSection>

        <StudioSection title="Practice exercises" icon="/icons/guide.svg" delay={0.5}>
          <div className="space-y-6">
            {draft.practice_exercises.map((ex, i) => (
              <motion.div 
                key={i} 
                className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 group-hover:bg-white transition-colors shadow-sm"
              >
                <div className="mb-4">
                  <Input
                    className="mb-3 h-10 text-sm font-bold bg-white border-slate-100 focus:border-blue-300 rounded-xl"
                    placeholder="Exercise Title"
                    value={ex.title}
                    onChange={(e) => {
                      const next = [...draft.practice_exercises];
                      const cur = next[i] ?? { title: "", prompt: "" };
                      next[i] = { title: e.target.value, prompt: cur.prompt, hint: cur.hint };
                      setDraft((d) => ({ ...d, practice_exercises: next }));
                    }}
                  />
                  <Textarea
                    className="mb-3 min-h-[90px] text-sm bg-white border-slate-100 focus:border-blue-300 rounded-xl leading-relaxed"
                    placeholder="Describe the exercise..."
                    value={ex.prompt}
                    onChange={(e) => {
                      const next = [...draft.practice_exercises];
                      const cur = next[i] ?? { title: "", prompt: "" };
                      next[i] = { title: cur.title, prompt: e.target.value, hint: cur.hint };
                      setDraft((d) => ({ ...d, practice_exercises: next }));
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                      <span className="text-[10px] font-bold">?</span>
                    </div>
                    <Input
                      className="h-8 flex-1 text-xs text-slate-500 bg-white/50 border-slate-100 focus:border-amber-200 rounded-lg italic"
                      placeholder="Optional hint for the learner"
                      value={ex.hint ?? ""}
                      onChange={(e) => {
                        const next = [...draft.practice_exercises];
                        const cur = next[i] ?? { title: "", prompt: "" };
                        const hint = e.target.value.trim() ? e.target.value : undefined;
                        next[i] = { title: cur.title, prompt: cur.prompt, hint };
                        setDraft((d) => ({ ...d, practice_exercises: next }));
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </StudioSection>

        <StudioSection title="Follow-up topics" icon="/icons/mentrixer.svg" delay={0.6}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {draft.follow_up_topics.map((t, i) => (
              <motion.div key={i} whileHover={{ y: -2 }}>
                <Input
                  value={t}
                  onChange={(e) => {
                    const next = [...draft.follow_up_topics];
                    next[i] = e.target.value;
                    setDraft((d) => ({ ...d, follow_up_topics: next }));
                  }}
                  className="h-10 text-sm border-slate-100 focus:border-blue-300 rounded-xl bg-slate-50/50 focus:bg-white transition-all"
                />
              </motion.div>
            ))}
          </div>
        </StudioSection>

        <StudioSection title={STUDIO_LOOP.practicePromptsTitle} icon="/icons/mentrixer.svg" delay={0.7}>
          <p className="mb-3 text-xs text-slate-500">{STUDIO_LOOP.practicePromptsSub}</p>
          <div className="space-y-4">
            {draft.followup_quests.map((quest, questIndex) => {
              const key = `${sessionId}-${questIndex}`;
              const indexLabel = String(questIndex + 1).padStart(2, "0");
              return (
                <motion.div
                  key={key}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/30 border border-blue-100"
                >
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                    {indexLabel}
                  </span>
                  <div className="flex-1">
                    <Textarea
                      className="min-h-[70px] text-sm bg-white border-blue-100 focus:border-blue-300 rounded-xl leading-relaxed"
                      value={quest.prompt}
                      onChange={(e) => {
                        const next = [...draft.followup_quests];
                        const cur = next[questIndex] ?? { prompt: "", difficulty: "medium" };
                        next[questIndex] = {
                          prompt: e.target.value,
                          difficulty: cur.difficulty,
                        };
                        setDraft((d) => ({ ...d, followup_quests: next }));
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </StudioSection>
      </div>
    </div>
  );
}

function getDurationLabel(startTime: string, endTime: string) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const minutes = Math.max(1, Math.round((end - start) / 60000));
  return `${minutes} min`;
}
