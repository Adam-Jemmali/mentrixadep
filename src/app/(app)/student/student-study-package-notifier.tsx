"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

const STORAGE_ACK = "mentrixa-studio-pkg-ack-v1";

type Snapshot = { sessionId: string; course: string; publishedAt: string | null };

/** Supabase Realtime `postgres_changes` shape for `session_ai_packages` (we only read `new`). */
type SessionAiPackageRealtimePayload = {
  new?: {
    session_id?: string;
    package_published_at?: string | null;
  } | null;
};

function loadAck(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_ACK);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return {};
    return p as Record<string, string>;
  } catch {
    return {};
  }
}

function saveAck(m: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_ACK, JSON.stringify(m));
  } catch {
    /* ignore quota */
  }
}

function pickLatestNew(
  snapshots: Snapshot[],
  ack: Record<string, string>,
  seedIfEmpty: boolean,
): { sessionId: string; course: string; publishedAt: string } | null {
  const withPub = snapshots.filter(
    (s): s is typeof s & { publishedAt: string } =>
      typeof s.publishedAt === "string" && s.publishedAt.length > 0,
  );
  if (withPub.length === 0) return null;

  if (seedIfEmpty && Object.keys(ack).length === 0) {
    const seed: Record<string, string> = {};
    for (const s of withPub) seed[s.sessionId] = s.publishedAt;
    saveAck(seed);
    return null;
  }

  let best: (typeof withPub)[number] | null = null;
  for (const s of withPub) {
    const prev = ack[s.sessionId];
    if (!prev || s.publishedAt > prev) {
      if (!best || s.publishedAt > best.publishedAt) best = s;
    }
  }
  if (!best) return null;
  return { sessionId: best.sessionId, course: best.course, publishedAt: best.publishedAt };
}

export function StudentStudyPackageNotifier({ snapshots }: { snapshots: Snapshot[] }) {
  const router = useRouter();
  const [banner, setBanner] = useState<{
    sessionId: string;
    course: string;
    publishedAt: string;
  } | null>(null);
  const lastRealtimeKeyRef = useRef<string | null>(null);

  const courseBySession = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of snapshots) m.set(s.sessionId, s.course);
    return m;
  }, [snapshots]);

  const allowedIds = useMemo(() => new Set(snapshots.map((s) => s.sessionId)), [snapshots]);

  const dismiss = useCallback(
    (sessionId: string, publishedAt: string) => {
      const ack = loadAck();
      ack[sessionId] = publishedAt;
      saveAck(ack);
      setBanner(null);
    },
    [],
  );

  useEffect(() => {
    const ack = loadAck();
    const next = pickLatestNew(snapshots, ack, true);
    if (next) setBanner(next);
  }, [snapshots]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("student-session-ai-packages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_ai_packages" },
        (payload: SessionAiPackageRealtimePayload) => {
          const row = payload.new ?? null;
          if (!row?.session_id || !row.package_published_at) return;
          if (!allowedIds.has(row.session_id)) return;

          const key = `${row.session_id}:${row.package_published_at}`;
          if (lastRealtimeKeyRef.current === key) return;
          lastRealtimeKeyRef.current = key;

          const course = courseBySession.get(row.session_id) ?? "your session";
          setBanner({
            sessionId: row.session_id,
            course,
            publishedAt: row.package_published_at,
          });
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [allowedIds, courseBySession, router]);

  if (!banner) return null;

  const href = `/student?sessionsTab=past&openStudyPackage=${encodeURIComponent(banner.sessionId)}#sessions-history`;

  return (
    <div
      className="mb-6 rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-indigo-50/80 px-5 py-4 text-sm text-slate-800 shadow-sm"
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 border border-violet-200/80">
            <Package className="h-5 w-5 text-violet-700" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">Your study package is ready</p>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Your guide published the Studio package for{" "}
              <span className="font-medium text-slate-800">{banner.course}</span>. Open session history to
              view flashcards, exercises, and follow-ups.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:pt-0.5">
          <Button size="sm" className="h-9 bg-violet-600 text-white hover:bg-violet-500" asChild>
            <Link
              href={href}
              className="inline-flex items-center gap-2"
              onClick={() => dismiss(banner.sessionId, banner.publishedAt)}
            >
              <Image src="/images/package.png" alt="" width={16} height={16} />
              View in history
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 border-slate-200 bg-white text-slate-700"
            onClick={() => dismiss(banner.sessionId, banner.publishedAt)}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
