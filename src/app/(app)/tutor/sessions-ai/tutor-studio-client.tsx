"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  publishStudioPackage,
  saveStudioPackageDraft,
  type TutorSessionWithPackage,
} from "@/app/actions/autoPilot";
import { useAdminViewContext } from "@/components/admin-view-context";
import type { SessionAiPackage } from "@/lib/database.types";
import { formatDate } from "@/lib/time-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const STREAM_END = "\n__MENTRIXA_STUDIO_END__";

type PackageFilter = "all" | "generated" | "pending";

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
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [closingRowId, setClosingRowId] = useState<string | null>(null);
  const [contextBySession, setContextBySession] = useState<Record<string, string>>({});
  const [streamPreviewBySession, setStreamPreviewBySession] = useState<Record<string, string>>(
    {},
  );
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [errorByRow, setErrorByRow] = useState<Record<string, string>>({});
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
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

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const hasPkg = row.aiPackage !== null;
      const published = Boolean(row.aiPackage?.package_published_at);
      if (packageFilter === "generated" && (!hasPkg || !published)) return false;
      if (packageFilter === "pending" && hasPkg) return false;
      if (courseFilter !== "all" && row.course !== courseFilter) return false;
      if (!q) return true;
      const name = (row.student_display_name ?? "").toLowerCase();
      const learner = (row.student_email ?? row.student_id ?? "").toLowerCase();
      const courseStr = (row.course ?? "").toLowerCase();
      return courseStr.includes(q) || learner.includes(q) || name.includes(q);
    });
  }, [rows, query, packageFilter, courseFilter]);

  useEffect(() => {
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

  const handleCopyQuestLink = async (sessionId: string, questIndex: number, prompt: string) => {
    const link = `/student/quest?prompt=${encodeURIComponent(prompt)}`;
    const key = `${sessionId}-${questIndex}`;
    await navigator.clipboard.writeText(link);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2000);
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

  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
        No sessions found.
      </div>
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by course or learner…"
          className="h-9 min-w-[200px] flex-1 text-xs"
        />

        <Select
          value={packageFilter}
          onValueChange={(value) => setPackageFilter(value as PackageFilter)}
        >
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sessions</SelectItem>
            <SelectItem value="generated">Published</SelectItem>
            <SelectItem value="pending">No package yet</SelectItem>
          </SelectContent>
        </Select>

        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course} value={course}>
                {course}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <table className="mentrixa-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Learner</th>
            <th>Date</th>
            <th>Duration</th>
            <th>Studio</th>
            <th className="w-[200px]">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
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
                  className="studio-row mentrixa-interactive"
                  onClick={() => {
                    if (hasPackage) toggleExpanded(session.id);
                  }}
                >
                  <td>
                    <Badge variant="outline" className="text-[11px] font-medium">
                      {session.course}
                    </Badge>
                  </td>
                  <td className="text-sm text-slate-700">{learnerLabel}</td>
                  <td className="text-sm text-slate-500">{formatDate(session.start_time)}</td>
                  <td className="font-mono text-xs text-slate-400">
                    {getDurationLabel(session.start_time, session.end_time)}
                  </td>
                  <td>
                    {!hasPackage ? (
                      <span className="font-mono text-[11px] text-slate-400">—</span>
                    ) : published ? (
                      <span className="font-mono text-[11px] text-slate-600">Published</span>
                    ) : (
                      <span className="font-mono text-[11px] text-amber-700">Draft</span>
                    )}
                  </td>
                  <td>
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
                            className="min-h-[56px] max-w-[280px] resize-y text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={isStreaming}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleGenerate(session.id);
                            }}
                            className="h-8 shrink-0 text-xs"
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
                        </>
                      ) : (
                        <button
                          type="button"
                          className="text-left text-xs font-medium text-slate-700 hover:text-slate-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(session.id);
                          }}
                        >
                          {isOpen ? "Close" : published ? "View / edit" : "Review draft"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {isStreaming && streamPreviewBySession[session.id] ? (
                  <tr>
                    <td colSpan={6} className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Model output (streaming preview)
                      </p>
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-600">
                        {streamPreviewBySession[session.id]}
                      </pre>
                    </td>
                  </tr>
                ) : null}

                {(isOpen || isClosing) && hasPackage && pkg ? (
                  <tr ref={expandedRowRef}>
                    <td colSpan={6} className="border-b border-slate-200 bg-slate-50/50">
                      <StudioPackagePanel
                        sessionId={session.id}
                        course={session.course}
                        pkg={pkg}
                        regenLeft={regenLeft}
                        tutorNotes={contextBySession[session.id] ?? ""}
                        onTutorNotesChange={(v) =>
                          setContextBySession((prev) => ({ ...prev, [session.id]: v }))
                        }
                        flippedCards={flippedCards}
                        copiedKey={copiedKey}
                        savingId={savingId}
                        publishingId={publishingId}
                        streamingId={streamingId}
                        onToggleCard={toggleCardFlip}
                        onCopyLink={handleCopyQuestLink}
                        onSave={async (draft) => {
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
                          router.refresh();
                        }}
                        onRegenerate={() => void handleRegenerate(session.id)}
                      />
                    </td>
                  </tr>
                ) : null}

                {errorByRow[session.id] ? (
                  <tr>
                    <td colSpan={6} className="py-2 text-xs text-red-600">
                      {errorByRow[session.id]}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <p className="mt-3 font-mono text-[11px] text-slate-400">
        {publishedCount} published · {rows.length} past sessions
      </p>
    </section>
  );
}

function StudioPackagePanel({
  sessionId,
  course,
  pkg,
  regenLeft,
  tutorNotes,
  onTutorNotesChange,
  flippedCards,
  copiedKey,
  savingId,
  publishingId,
  streamingId,
  onToggleCard,
  onCopyLink,
  onSave,
  onPublish,
  onRegenerate,
}: {
  sessionId: string;
  course: string;
  pkg: SessionAiPackage;
  regenLeft: number;
  tutorNotes: string;
  onTutorNotesChange: (v: string) => void;
  flippedCards: Set<string>;
  copiedKey: string | null;
  savingId: string | null;
  publishingId: string | null;
  streamingId: string | null;
  onToggleCard: (key: string) => void;
  onCopyLink: (sessionId: string, i: number, prompt: string) => void;
  onSave: (draft: DraftEdit) => Promise<void>;
  onPublish: () => Promise<void>;
  onRegenerate: () => void;
}) {
  const [draft, setDraft] = useState<DraftEdit>(() => pkgToDraft(pkg));

  useEffect(() => {
    setDraft(pkgToDraft(pkg));
  }, [pkg]);

  const published = Boolean(pkg.package_published_at);
  const busy = savingId === sessionId || publishingId === sessionId;
  const streaming = streamingId === sessionId;

  return (
    <div className="px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 space-y-4 border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-900">Studio output</h2>
            <p className="mt-1 text-xs text-slate-500">
              {course} · {published ? "Visible to your learner" : "Draft — publish when ready"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            disabled={busy || streaming}
            onClick={() => void onSave(draft)}
          >
            {savingId === sessionId ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save edits"
            )}
          </Button>
          {!published ? (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={busy || streaming}
              onClick={() => void onPublish()}
            >
              {publishingId === sessionId ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Publishing…
                </>
              ) : (
                "Send to learner"
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={busy || streaming || regenLeft <= 0}
            onClick={onRegenerate}
          >
            {streaming ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Regenerating…
              </>
            ) : (
              `Regenerate (${regenLeft} left)`
            )}
          </Button>
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
            Guide notes for generation / regenerate (optional)
          </label>
          <Textarea
            value={tutorNotes}
            onChange={(e) => onTutorNotesChange(e.target.value)}
            placeholder="e.g. Integration by parts — learner struggled with u-substitution"
            className="min-h-[72px] text-sm"
          />
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-8">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Summary
          </label>
          <Textarea
            value={draft.summary}
            onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
            className="min-h-[100px] text-sm"
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Key points
          </p>
          <ul className="space-y-2">
            {draft.key_points.map((point, i) => (
              <li key={i}>
                <Input
                  value={point}
                  onChange={(e) => {
                    const next = [...draft.key_points];
                    next[i] = e.target.value;
                    setDraft((d) => ({ ...d, key_points: next }));
                  }}
                  className="h-9 text-sm"
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Flashcards
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {draft.flashcards.map((card, cardIndex) => {
              const cardKey = `${sessionId}-card-${cardIndex}`;
              const isFlipped = flippedCards.has(cardKey);
              return (
                <div key={cardKey} className="w-[200px] flex-shrink-0 space-y-2">
                  <div
                    className="card-scene cursor-pointer"
                    onClick={() => onToggleCard(cardKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onToggleCard(cardKey);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`card ${isFlipped ? "is-flipped" : ""}`}>
                      <div className="card-face card-face--front">
                        <p className="text-[11px] leading-snug text-slate-600">{card.q}</p>
                      </div>
                      <div className="card-face card-face--back">
                        <p className="text-[11px] leading-snug text-slate-800">{card.a}</p>
                      </div>
                    </div>
                  </div>
                  <Input
                    className="h-8 text-[11px]"
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
                    className="h-8 text-[11px]"
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
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Practice exercises
          </p>
          <div className="space-y-4">
            {draft.practice_exercises.map((ex, i) => (
              <div key={i} className="rounded-md border border-slate-100 bg-slate-50/80 p-3">
                <Input
                  className="mb-2 h-8 text-sm font-medium"
                  value={ex.title}
                  onChange={(e) => {
                    const next = [...draft.practice_exercises];
                    const cur = next[i] ?? { title: "", prompt: "" };
                    next[i] = { title: e.target.value, prompt: cur.prompt, hint: cur.hint };
                    setDraft((d) => ({ ...d, practice_exercises: next }));
                  }}
                />
                <Textarea
                  className="mb-2 min-h-[72px] text-sm"
                  value={ex.prompt}
                  onChange={(e) => {
                    const next = [...draft.practice_exercises];
                    const cur = next[i] ?? { title: "", prompt: "" };
                    next[i] = { title: cur.title, prompt: e.target.value, hint: cur.hint };
                    setDraft((d) => ({ ...d, practice_exercises: next }));
                  }}
                />
                <Input
                  className="h-8 text-xs text-slate-600"
                  placeholder="Optional hint"
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
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Follow-up topics
          </p>
          <ul className="space-y-2">
            {draft.follow_up_topics.map((t, i) => (
              <li key={i}>
                <Input
                  value={t}
                  onChange={(e) => {
                    const next = [...draft.follow_up_topics];
                    next[i] = e.target.value;
                    setDraft((d) => ({ ...d, follow_up_topics: next }));
                  }}
                  className="h-9 text-sm"
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Quest prompts (open in Mentrixa Quest)
          </p>
          {draft.followup_quests.map((quest, questIndex) => {
            const key = `${sessionId}-${questIndex}`;
            const indexLabel = String(questIndex + 1).padStart(2, "0");
            return (
              <div key={key} className="mb-3 flex items-start gap-3">
                <span className="w-6 flex-shrink-0 font-mono text-[11px] text-slate-400">
                  {indexLabel}
                </span>
                <Textarea
                  className="min-h-[56px] flex-1 text-sm"
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
                <button
                  type="button"
                  className={`flex-shrink-0 text-[11px] ${
                    copiedKey === key ? "text-slate-900" : "text-slate-400 hover:text-slate-700"
                  }`}
                  onClick={() => {
                    void onCopyLink(sessionId, questIndex, quest.prompt);
                  }}
                >
                  {copiedKey === key ? "Copied" : "Copy link"}
                </button>
              </div>
            );
          })}
        </section>
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
