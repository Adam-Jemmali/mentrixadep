"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { requestJoinPublicClan } from "@/app/actions/clan";
import { searchPublicClans } from "@/app/actions/clan-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClanBrowseClient() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<
    { id: string; name: string; tag: string; member_count: number }[]
  >([]);
  const [joining, setJoining] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setErr(null);
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
      setInfo(
        "Request sent. The leader will approve you — check back from Clans in the nav."
      );
      return;
    }
    window.location.href = `/student/clan/${id}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type at least 2 characters…"
          className="sm:max-w-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
        />
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void search()}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {info && <p className="text-sm text-slate-700">{info}</p>}
      {rows.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {rows.map((r, i) => (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.18 }}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-400 font-mono">
                  {r.tag} · {r.member_count} members
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/student/clan/${r.id}`}>View</Link>
                </Button>
                <Button
                  size="sm"
                  type="button"
                  disabled={joining !== null}
                  onClick={() => void join(r.id)}
                >
                  {joining === r.id ? "…" : "Join"}
                </Button>
              </div>
            </motion.li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
