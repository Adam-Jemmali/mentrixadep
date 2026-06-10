"use client";

import { searchPublicClans } from "@/features/clans/clan-reads";
import type { PublicClanBrowseRow } from "@/features/clans/clan-reads";
import { requestJoinPublicClan } from "@/features/clans/clan-membership";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";


import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  clanArenaLightMeta,
  clanArenaLightRowMuted,
  clanArenaLightRowStrong,
  clanArenaLightRowTitle,
  clanArenaOutlineButton,
  clanArenaPrimaryButton,
  clanLightInput,
} from "@/features/clans/clan-light-form-ui";
import { resolveDivisionFocusIcon } from "@/features/divisions/division-focus-icons";
import { cn } from "@/shared/core/utils";

function ClanBrowseRow({
  row,
  rank,
  joining,
  onJoin,
}: {
  row: PublicClanBrowseRow;
  rank?: number;
  joining: string | null;
  onJoin: (id: string) => void;
}) {
  const FocusIcon = resolveDivisionFocusIcon(
    row.focus_division_key ?? "general",
    row.focus_label,
  );

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          {rank != null ? (
            <span className="mt-0.5 w-6 shrink-0 text-xs font-black tabular-nums text-violet-700">
              #{rank}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className={cn("truncate", clanArenaLightRowTitle)}>{row.name}</p>
            <p className={cn("mt-0.5 font-mono", clanArenaLightRowMuted)}>{row.tag}</p>
            <dl className={cn("mt-2 grid gap-1 sm:grid-cols-2 sm:gap-x-4", clanArenaLightRowMuted)}>
              <div>
                <dt className="sr-only">Members</dt>
                <dd>
                  <span className={clanArenaLightRowStrong}>{row.member_count}</span>{" "}
                  member{row.member_count === 1 ? "" : "s"}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Leader</dt>
                <dd>
                  Leader <span className={clanArenaLightRowStrong}>{row.leader_name}</span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="sr-only">Focus</dt>
                <dd className="flex items-center gap-1.5">
                  <FocusIcon className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
                  <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-zinc-900">
                    {row.focus_label}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" className={clanArenaOutlineButton} asChild>
          <Link href={`/student/clan/${row.id}`}>View</Link>
        </Button>
        <Button
          size="sm"
          type="button"
          className={clanArenaPrimaryButton}
          disabled={joining !== null}
          onClick={() => onJoin(row.id)}
        >
          {joining === row.id ? "…" : "Join"}
        </Button>
      </div>
    </div>
  );
}

function ClanList({
  rows,
  showRank,
  joining,
  onJoin,
  emptyMessage,
}: {
  rows: PublicClanBrowseRow[];
  showRank?: boolean;
  joining: string | null;
  onJoin: (id: string) => void;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return emptyMessage ? (
      <p className={cn("px-4 py-6 text-center", clanArenaLightMeta)}>{emptyMessage}</p>
    ) : null;
  }

  return (
    <ul className="divide-y divide-slate-200">
      {rows.map((r, i) => (
        <motion.li
          key={r.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.18 }}
        >
          <ClanBrowseRow
            row={r}
            rank={showRank ? i + 1 : undefined}
            joining={joining}
            onJoin={onJoin}
          />
        </motion.li>
      ))}
    </ul>
  );
}

export function ClanBrowseClient({ topClans }: { topClans: PublicClanBrowseRow[] }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [rows, setRows] = useState<PublicClanBrowseRow[]>([]);
  const [joining, setJoining] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setErr(null);
    setSearched(true);
    const r = await searchPublicClans(q);
    setRows(r);
    setLoading(false);
  }

  async function join(id: string) {
    setJoining(id);
    setErr(null);
    setInfo(null);
    const r = await requestJoinPublicClan(id);
    setJoining(null);
    if (!r.success) {
      setErr(r.error);
      return;
    }
    if (!r.joined) {
      setInfo("Request sent. Leader will approve.");
      return;
    }
    window.location.href = `/student/clan/${id}`;
  }

  const showingSearch = searched && q.trim().length >= 2;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type at least 2 characters…"
            className={cn(clanLightInput, "mt-0 sm:max-w-xs")}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className={clanArenaOutlineButton}
            disabled={loading}
            onClick={() => void search()}
          >
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>

        {err ? <p className="text-sm font-medium text-red-700">{err}</p> : null}
        {info ? <p className="text-sm font-medium text-emerald-800">{info}</p> : null}

        {showingSearch ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
                Search results
              </p>
              <p className={cn("mt-0.5", clanArenaLightMeta)}>
                {rows.length > 0
                  ? `${rows.length} clan${rows.length === 1 ? "" : "s"} matching “${q.trim()}”`
                  : `No clans matching “${q.trim()}”`}
              </p>
            </div>
            <ClanList
              rows={rows}
              joining={joining}
              onJoin={(id) => void join(id)}
              emptyMessage="Try a different name or browse top clans."
            />
          </div>
        ) : (
          <p className={clanArenaLightMeta}>Search by clan name, or pick from the top public clans.</p>
        )}
      </div>

      <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:sticky lg:top-24">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
            Top clans
          </p>
          <p className={cn("mt-0.5", clanArenaLightMeta)}>Ranked by member count</p>
        </div>
        {topClans.length > 0 ? (
          <ClanList
            rows={topClans}
            showRank
            joining={joining}
            onJoin={(id) => void join(id)}
          />
        ) : (
          <p className={cn("px-4 py-6 text-center", clanArenaLightMeta)}>
            No public clans yet. Be the first to create one.
          </p>
        )}
      </aside>
    </div>
  );
}
