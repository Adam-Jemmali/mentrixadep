"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { generateSessionPackage, type TutorSessionWithPackage } from "@/app/actions/autoPilot";
import { useAdminViewContext } from "@/components/admin-view-context";
import type { SessionAiPackage } from "@/lib/database.types";
import { formatDate } from "@/lib/time-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PackageFilter = "all" | "generated" | "pending";

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
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [errorByRow, setErrorByRow] = useState<Record<string, string>>({});
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { viewingAsUserId } = useAdminViewContext();
  const router = useRouter();

  const expandedRowRef = useRef<HTMLTableRowElement | null>(null);

  const courses = useMemo(
    () => Array.from(new Set(rows.map((row) => row.course))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (packageFilter === "generated" && !row.aiPackage) return false;
      if (packageFilter === "pending" && row.aiPackage) return false;
      if (courseFilter !== "all" && row.course !== courseFilter) return false;
      if (!q) return true;
      const learner = (row.student_email ?? row.student_id ?? "").toLowerCase();
      const courseStr = (row.course ?? "").toLowerCase();
      return courseStr.includes(q) || learner.includes(q);
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

  const generatedCount = useMemo(
    () => rows.filter((row) => row.aiPackage !== null).length,
    [rows],
  );

  const handleGenerate = async (sessionId: string) => {
    setGeneratingId(sessionId);
    setErrorByRow((prev) => ({ ...prev, [sessionId]: "" }));

    const result = await generateSessionPackage(sessionId, viewingAsUserId ?? undefined);
    if ("error" in result) {
      setErrorByRow((prev) => ({ ...prev, [sessionId]: result.error }));
      setGeneratingId(null);
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === sessionId ? { ...row, aiPackage: result.package } : row,
      ),
    );
    setGeneratingId(null);
    setOpenRowId(sessionId);
    router.refresh();
  };

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

  const handleCopyQuestLink = async (
    sessionId: string,
    questIndex: number,
    prompt: string,
  ) => {
    const link = `/student/quest?prompt=${encodeURIComponent(prompt)}`;
    const key = `${sessionId}-${questIndex}`;
    await navigator.clipboard.writeText(link);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2000);
  };

  if (!rows.length) {
    return (
      <div className="border border-dashed border-slate-200 rounded-md p-10 text-center text-sm text-slate-400">
        No sessions found.
      </div>
    );
  }

  return (
    <section>
      <div className="flex gap-3 mb-5">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sessions..."
          className="h-9 text-xs flex-1"
        />

        <Select
          value={packageFilter}
          onValueChange={(value) => setPackageFilter(value as PackageFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="generated">Generated</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All courses" />
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
            <th>Package</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-sm text-slate-500 py-10">
                No sessions match your filters.
                {rows.length > 0 ? (
                  <span className="block mt-2 text-xs text-slate-400">
                    Showing 0 of {rows.length} past sessions — set status to &quot;All&quot;, course
                    to &quot;All courses&quot;, or clear search.
                  </span>
                ) : null}
              </td>
            </tr>
          )}

          {filteredRows.map((session) => {
            const hasPackage = session.aiPackage !== null;
            const isGenerating = generatingId === session.id;
            const isOpen = openRowId === session.id;
            const isClosing = closingRowId === session.id;
            const learner =
              session.student_email ??
              (session.student_id
                ? `${session.student_id.slice(0, 8)}…`
                : "—");

            return (
              <Fragment key={session.id}>
                <tr
                  className="studio-row mentrixa-interactive"
                  onClick={() => {
                    if (hasPackage) toggleExpanded(session.id);
                  }}
                >
                  <td>
                    <Badge variant="outline" className="text-[11px]">
                      {session.course}
                    </Badge>
                  </td>
                  <td className="text-sm text-slate-700">{learner}</td>
                  <td className="text-sm text-slate-400">{formatDate(session.start_time)}</td>
                  <td className="font-mono text-xs text-slate-300">
                    {getDurationLabel(session.start_time, session.end_time)}
                  </td>
                  <td>
                    {hasPackage ? (
                      <span className="font-mono text-xs text-green-700">ready</span>
                    ) : isGenerating ? (
                      <span className="font-mono text-xs text-mentrixa-600">generating...</span>
                    ) : (
                      <span className="font-mono text-xs text-slate-400">pending</span>
                    )}
                  </td>
                  <td>
                    {hasPackage ? (
                      <button
                        type="button"
                        className="text-sm text-mentrixa-600 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(session.id);
                        }}
                      >
                        {isOpen ? "Close" : "View"}
                      </button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isGenerating}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleGenerate(session.id);
                        }}
                        className={isGenerating ? "studio-generate-loading" : ""}
                      >
                        {isGenerating ? "Generating..." : "Generate"}
                      </Button>
                    )}
                  </td>
                </tr>

                {(isOpen || isClosing) && hasPackage && (
                  <tr ref={expandedRowRef}>
                    <td colSpan={6} className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <ExpandedPackageDocument
                        sessionId={session.id}
                        pkg={session.aiPackage as SessionAiPackage}
                        flippedCards={flippedCards}
                        copiedKey={copiedKey}
                        onToggleCard={toggleCardFlip}
                        onCopyLink={handleCopyQuestLink}
                      />
                    </td>
                  </tr>
                )}

                {errorByRow[session.id] && (
                  <tr>
                    <td colSpan={6} className="text-xs text-red-600 py-2">
                      {errorByRow[session.id]}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <p className="mt-3 text-xs text-slate-400 font-mono">
        {filteredRows.length === rows.length
          ? `${generatedCount} total generated packages`
          : `${filteredRows.filter((r) => r.aiPackage).length} shown · ${generatedCount} total generated · ${rows.length} past sessions`}
      </p>
    </section>
  );
}

function ExpandedPackageDocument({
  sessionId,
  pkg,
  flippedCards,
  copiedKey,
  onToggleCard,
  onCopyLink,
}: {
  sessionId: string;
  pkg: SessionAiPackage;
  flippedCards: Set<string>;
  copiedKey: string | null;
  onToggleCard: (key: string) => void;
  onCopyLink: (sessionId: string, questIndex: number, prompt: string) => void;
}) {
  const keyPoints = pkg.key_points ?? [];
  const flashcards = pkg.flashcards ?? [];
  const quests = pkg.followup_quests ?? [];

  return (
    <div className="px-4 py-6 md:px-6 md:py-8">
      <article className="max-w-[680px]">
        <section>
          <p className="text-xs font-mono text-slate-300 uppercase tracking-widest mb-3">
            Session summary
          </p>
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
            {pkg.summary ?? "No summary generated yet."}
          </p>
        </section>

        <hr className="border-0 border-b border-[#F1F5F9] my-5" />

        <section>
          <p className="text-xs font-mono text-slate-300 uppercase tracking-widest mb-3">
            Key points
          </p>
          {keyPoints.length > 0 ? (
            <ol className="counter-list">
              {keyPoints.map((point, pointIndex) => (
                <li key={`${sessionId}-point-${pointIndex}`} className="counter-item text-sm text-slate-600">
                  {point}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-400">No key points available.</p>
          )}
        </section>

        <hr className="border-0 border-b border-[#F1F5F9] my-5" />

        <section>
          <p className="text-xs font-mono text-slate-300 uppercase tracking-widest mb-3">
            Flashcards ({flashcards.length})
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {flashcards.map((card, cardIndex) => {
              const cardKey = `${sessionId}-card-${cardIndex}`;
              const isFlipped = flippedCards.has(cardKey);
              return (
                <div key={cardKey} className="card-scene" onClick={() => onToggleCard(cardKey)}>
                  <div className={`card ${isFlipped ? "is-flipped" : ""}`}>
                    <div className="card-face card-face--front">
                      <p className="text-xs text-slate-500 leading-snug">{card.q}</p>
                    </div>
                    <div className="card-face card-face--back">
                      <p className="text-xs text-mentrixa-800 leading-snug">{card.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {flashcards.length === 0 && (
              <p className="text-sm text-slate-400">No flashcards generated.</p>
            )}
          </div>
        </section>

        <hr className="border-0 border-b border-[#F1F5F9] my-5" />

        <section>
          <p className="text-xs font-mono text-slate-300 uppercase tracking-widest mb-3">
            Follow-up practice ({quests.length})
          </p>
          {quests.map((quest, questIndex) => {
            const key = `${sessionId}-${questIndex}`;
            const indexLabel = String(questIndex + 1).padStart(2, "0");
            return (
              <div key={key} className="flex items-start gap-3 mb-3">
                <span className="text-xs font-mono text-slate-300 w-5 flex-shrink-0">
                  {indexLabel}
                </span>
                <p className="text-sm text-slate-600 leading-relaxed flex-1">{quest.prompt}</p>
                <button
                  type="button"
                  className={`text-xs flex-shrink-0 ${
                    copiedKey === key
                      ? "text-mentrixa-600"
                      : "text-slate-400 hover:text-mentrixa-600"
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
          {quests.length === 0 && (
            <p className="text-sm text-slate-400">No follow-up prompts generated.</p>
          )}
        </section>
      </article>
    </div>
  );
}

function getDurationLabel(startTime: string, endTime: string) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const minutes = Math.max(1, Math.round((end - start) / 60000));
  return `${minutes} min`;
}
