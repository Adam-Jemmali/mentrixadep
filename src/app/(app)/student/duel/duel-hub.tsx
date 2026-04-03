"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  joinDuelQueue,
  leaveDuelQueue,
  pollDuelQueue,
  createClanSkillDuel,
  createAiDuelFromQueue,
} from "@/app/actions/duel";
import { DUEL_AI_QUEUE_WAIT_MS } from "@/lib/duel-constants";
import {
  createClan,
  getMyClan,
  joinClanByCode,
  leaveClan,
  regenerateInviteCode,
  type MyClanResult,
} from "@/app/actions/clan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DivisionPickerCards } from "@/components/student/division-picker-cards";

interface Props {
  divisions: { key: string; name: string; description: string | null }[];
  /** Syncs with Division arena “home” focus when set */
  preferredDivisionKey: string | null;
  initialClan: MyClanResult;
  initialQueueDivision: string | null;
  myUserId: string;
}

function resolveInitialDivisionKey(
  divisions: { key: string }[],
  queueDivision: string | null,
  preferred: string | null
): string {
  const keys = new Set(divisions.map((d) => d.key));
  if (queueDivision && keys.has(queueDivision)) return queueDivision;
  if (preferred && keys.has(preferred)) return preferred;
  return divisions[0]?.key ?? "";
}

export function DuelHub({
  divisions,
  preferredDivisionKey,
  initialClan,
  initialQueueDivision,
  myUserId,
}: Props) {
  const router = useRouter();

  const initialKey = useMemo(
    () =>
      resolveInitialDivisionKey(
        divisions,
        initialQueueDivision,
        preferredDivisionKey
      ),
    [divisions, initialQueueDivision, preferredDivisionKey]
  );

  const [clanState, setClanState] = useState<MyClanResult>(initialClan);
  const [divisionKey, setDivisionKey] = useState(initialKey);
  const [queuePhase, setQueuePhase] = useState<"idle" | "waiting">(
    initialQueueDivision ? "waiting" : "idle"
  );
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [clanName, setClanName] = useState("");
  const [clanTag, setClanTag] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [clanBusy, setClanBusy] = useState(false);
  const [clanError, setClanError] = useState<string | null>(null);

  const [challengeLoading, setChallengeLoading] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  const activeDivisionLabel =
    divisions.find((d) => d.key === divisionKey)?.name ?? divisionKey;

  async function refreshClan() {
    const c = await getMyClan();
    setClanState(c);
  }

  useEffect(() => {
    if (queuePhase !== "waiting" || !divisionKey) return;
    const tick = async () => {
      const p = await pollDuelQueue(divisionKey);
      if (p?.state === "matched" && p.duelId) {
        router.push(`/student/duel/${p.duelId}`);
      }
    };
    const id = setInterval(() => void tick(), 2000);
    void tick();
    return () => clearInterval(id);
  }, [queuePhase, divisionKey, router]);

  /** No human in ~60s → AI sparring opponent (same question set) */
  useEffect(() => {
    if (queuePhase !== "waiting" || !divisionKey) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        const p = await pollDuelQueue(divisionKey);
        if (p?.state === "matched" && p.duelId) {
          router.push(`/student/duel/${p.duelId}`);
          return;
        }
        const r = await createAiDuelFromQueue(divisionKey);
        if (!cancelled && r.success) {
          router.push(`/student/duel/${r.duelId}`);
        }
      })();
    }, DUEL_AI_QUEUE_WAIT_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [queuePhase, divisionKey, router]);

  async function findMatch() {
    if (!divisionKey) return;
    setQueueLoading(true);
    setQueueError(null);
    try {
      const r = await joinDuelQueue(divisionKey);
      if (!r || typeof r !== "object" || !("success" in r)) {
        setQueueError("Matchmaking failed. Please try again.");
        return;
      }
      if (!r.success) {
        setQueueError(r.error);
        return;
      }
      if (r.state === "matched" && "duelId" in r && r.duelId) {
        router.push(`/student/duel/${r.duelId}`);
        return;
      }
      setQueuePhase("waiting");
    } catch {
      setQueueError("Matchmaking failed. Please try again.");
    } finally {
      setQueueLoading(false);
    }
  }

  async function cancelQueue() {
    setQueueLoading(true);
    await leaveDuelQueue();
    setQueueLoading(false);
    setQueuePhase("idle");
    router.refresh();
  }

  async function onCreateClan() {
    setClanBusy(true);
    setClanError(null);
    const r = await createClan(clanName, clanTag);
    setClanBusy(false);
    if (!r.success) {
      setClanError(r.error);
      return;
    }
    setClanName("");
    setClanTag("");
    await refreshClan();
    router.refresh();
  }

  async function onJoinClan() {
    setClanBusy(true);
    setClanError(null);
    const r = await joinClanByCode(joinCode);
    setClanBusy(false);
    if (!r.success) {
      setClanError(r.error);
      return;
    }
    setJoinCode("");
    await refreshClan();
    router.refresh();
  }

  async function onLeaveClan() {
    setClanBusy(true);
    setClanError(null);
    const r = await leaveClan();
    setClanBusy(false);
    if (!r.success) {
      setClanError(r.error);
      return;
    }
    await refreshClan();
    router.refresh();
  }

  async function onRegenerateCode() {
    setClanBusy(true);
    setClanError(null);
    const r = await regenerateInviteCode();
    setClanBusy(false);
    if (!r.success) {
      setClanError(r.error);
      return;
    }
    await refreshClan();
    router.refresh();
  }

  async function challengeMember(opponentId: string) {
    if (!divisionKey) return;
    setChallengeLoading(opponentId);
    setChallengeError(null);
    const r = await createClanSkillDuel(opponentId, divisionKey);
    setChallengeLoading(null);
    if (!r.success) {
      setChallengeError(r.error);
      return;
    }
    router.push(`/student/duel/${r.duelId}`);
  }

  if (divisions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No subject divisions are available yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="match" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="match">Find match</TabsTrigger>
          <TabsTrigger value="clan">Clan</TabsTrigger>
        </TabsList>

        <TabsContent value="match" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Matchmaking
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Same subject queue as the Division arena—pick where you want to
                fight. Both players need duel opt-in in Settings.
              </p>
            </div>
            {queuePhase === "waiting" ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Searching in </span>
                <span className="text-slate-800">{activeDivisionLabel}</span>
                <span className="text-slate-500">
                  {" "}
                  — we match by similar level (±1). If no one joins in about a
                  minute, you’ll face a sparring AI with the same questions.
                </span>
              </div>
            ) : (
              <>
                <DivisionPickerCards
                  mode="select"
                  divisions={divisions}
                  selectedKey={divisionKey}
                  onSelect={setDivisionKey}
                  compact
                />
                <p className="text-[11px] text-slate-400">
                  Default follows your{" "}
                  <Link
                    href="/student/division"
                    className="text-mentrixa-600 underline-offset-2 hover:underline"
                  >
                    home arena
                  </Link>{" "}
                  focus. Change it there anytime.
                </p>
              </>
            )}
            {queueError && (
              <p className="text-sm text-red-600">{queueError}</p>
            )}
            {queuePhase === "idle" ? (
              <Button
                type="button"
                disabled={queueLoading || !divisionKey}
                onClick={() => void findMatch()}
              >
                {queueLoading ? "Searching…" : "Find opponent"}
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <p className="text-sm text-slate-600">
                  Looking for an opponent in this division…
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={queueLoading}
                  onClick={() => void cancelQueue()}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="clan" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-6">
            {!clanState.clan ? (
              <>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Create a clan
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Name your clan and pick a short tag (letters and numbers, shown
                    in caps).
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      Clan name
                    </label>
                    <Input
                      value={clanName}
                      onChange={(e) => setClanName(e.target.value)}
                      placeholder="The Scholars"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Tag</label>
                    <Input
                      value={clanTag}
                      onChange={(e) => setClanTag(e.target.value)}
                      placeholder="e.g. ACME"
                      className="bg-white"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={
                    clanBusy || clanName.trim().length < 2 || clanTag.trim().length < 2
                  }
                  onClick={() => void onCreateClan()}
                >
                  {clanBusy ? "Creating…" : "Create clan"}
                </Button>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Join with invite code
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 mb-2">
                    Ask your leader for the code.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="6-character code"
                      className="bg-white sm:max-w-xs"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={clanBusy || joinCode.trim().length < 4}
                      onClick={() => void onJoinClan()}
                    >
                      {clanBusy ? "Joining…" : "Join clan"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {clanState.clan.name}{" "}
                      <span className="text-slate-400 font-mono text-sm">
                        [{clanState.clan.tag}]
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Invite code:{" "}
                      <span className="font-mono text-slate-700">
                        {clanState.clan.invite_code}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" asChild>
                      <Link href={`/student/clan/${clanState.clan.id}`}>
                        Clan dashboard
                      </Link>
                    </Button>
                    {clanState.myRole === "leader" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={clanBusy}
                        onClick={() => void onRegenerateCode()}
                      >
                        New code
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={clanBusy}
                      onClick={() => void onLeaveClan()}
                    >
                      Leave clan
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Quiz topic for challenges
                  </label>
                  <DivisionPickerCards
                    mode="select"
                    divisions={divisions}
                    selectedKey={divisionKey}
                    onSelect={setDivisionKey}
                    compact
                  />
                </div>

                {challengeError && (
                  <p className="text-sm text-red-600">{challengeError}</p>
                )}

                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Members
                  </h3>
                  <ul className="divide-y divide-slate-100 border border-slate-100 rounded-md">
                    {clanState.members.map((m) => {
                      const label =
                        m.display_name?.trim() ||
                        `Learner ${m.user_id.slice(0, 8)}`;
                      const isSelf = m.user_id === myUserId;
                      return (
                        <li
                          key={m.user_id}
                          className="px-3 py-2 flex items-center justify-between gap-2 flex-wrap"
                        >
                          <div>
                            <span className="text-sm text-slate-900">{label}</span>
                            {m.role === "leader" && (
                              <span className="ml-2 text-xs text-amber-700">
                                Leader
                              </span>
                            )}
                          </div>
                          {!isSelf ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={
                                challengeLoading === m.user_id || !divisionKey
                              }
                              onClick={() => void challengeMember(m.user_id)}
                            >
                              {challengeLoading === m.user_id ? "…" : "Challenge"}
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">You</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs text-slate-400 mt-2">
                    Use the same division selector as above. Opponents must allow
                    duels in Settings.
                  </p>
                </div>
              </>
            )}
            {clanError && (
              <p className="text-sm text-red-600">{clanError}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
