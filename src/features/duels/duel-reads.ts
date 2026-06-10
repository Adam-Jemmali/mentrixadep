"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { parseUUID } from "@/shared/core/security";
import type { SkillDuelQuestion } from "@/shared/types/database";

export type DuelPublicRow = {
  id: string;
  student_id: string;
  opponent_student_id: string | null;
  initiator_id: string | null;
  division_key: string;
  status: string;
  match_source: string | null;
  is_ai_opponent: boolean;
  questions: {
    prompt: string;
    choices: string[];
    type?: SkillDuelQuestion["type"];
  }[];
  fullQuestions?: SkillDuelQuestion[];
  student_answers: number[] | null;
  opponent_answers: number[] | null;
  /** Server-only derived while active — live score without exposing correct indices */
  student_running_score?: number;
  opponent_running_score?: number;
  student_score: number | null;
  opponent_score: number | null;
  winner: string | null;
  reward_amount_cents: number;
  created_at: string;
  completed_at: string | null;
};

export type DuelParticipantClan = {
  name: string;
  tag: string;
  avatarKind: "preset" | "custom";
  presetKey: string | null;
  avatarUrl: string | null;
};

export type DuelMatchupPreview = {
  duelId: string;
  divisionKey: string;
  me: {
    id: string;
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    totalXp: number | null;
    clan: DuelParticipantClan | null;
  };
  opponent: {
    id: string | null;
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    totalXp: number | null;
    isAi: boolean;
    clan: DuelParticipantClan | null;
  };
};

function mapClanRowForDuelPreview(
  row: {
    name: string;
    tag: string;
    avatar_kind?: string | null;
    avatar_preset_key?: string | null;
    avatar_url?: string | null;
  } | null
): DuelParticipantClan | null {
  if (!row) return null;
  const avatarUrl =
    typeof row.avatar_url === "string" && row.avatar_url.trim().length > 0
      ? row.avatar_url.trim()
      : null;
  return {
    name: row.name,
    tag: row.tag,
    avatarKind:
      row.avatar_kind === "custom" ? "custom" : "preset",
    presetKey:
      typeof row.avatar_preset_key === "string" && row.avatar_preset_key.trim()
        ? row.avatar_preset_key.trim()
        : null,
    avatarUrl,
  };
}

export async function getLearnerPreview(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ 
  id: string; 
  name: string; 
  avatarUrl: string | null; 
  bio: string | null; 
  totalXp: number | null;
  clan: DuelParticipantClan | null;
}> {
  const { data: settings } = await admin
    .from("user_settings")
    .select("display_name, avatar_url, bio")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: xpRow } = await admin
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: membership } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", userId)
    .maybeSingle();

  let clan: DuelParticipantClan | null = null;
  if (membership?.clan_id) {
    const { data: clanRow } = await admin
      .from("clans")
      .select("name, tag, avatar_kind, avatar_preset_key, avatar_url")
      .eq("id", membership.clan_id)
      .maybeSingle();
    clan = mapClanRowForDuelPreview(clanRow);
  }

  const displayName =
    typeof settings?.display_name === "string" ? settings.display_name.trim() : "";
  const avatarUrl =
    typeof settings?.avatar_url === "string" && settings.avatar_url.trim().length > 0
      ? settings.avatar_url.trim()
      : null;
  const bio = typeof settings?.bio === "string" && settings.bio.trim().length > 0 ? settings.bio.trim() : null;
  const totalXp = typeof xpRow?.total_xp === "number" ? xpRow.total_xp : null;

  const result = { 
    id: userId, 
    name: displayName || "Learner", 
    avatarUrl, 
    bio, 
    totalXp, 
    clan 
  };

  if (displayName.length > 0) {
    return result;
  }

  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data?.user?.email ?? "";
    result.name = email ? (email.split("@")[0] ?? "").trim() : "Learner";
    return result;
  } catch {
    return result;
  }
}

export async function getDuelMatchupPreview(
  duelId: string
): Promise<{ success: true; preview: DuelMatchupPreview } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student" && user.role !== "admin") {
      return { success: false, error: "Not allowed." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    const admin = createAdminClient();
    const { data: duel, error } = await admin
      .from("skill_duels")
      .select("id, student_id, opponent_student_id, division_key, is_ai_opponent")
      .eq("id", id.id)
      .maybeSingle();

    if (error || !duel) {
      return { success: false, error: "Duel not found." };
    }

    const isAi = (duel as { is_ai_opponent?: boolean }).is_ai_opponent === true;
    const isParticipant =
      duel.student_id === user.id || (!isAi && duel.opponent_student_id === user.id);
    if (!isParticipant) {
      return { success: false, error: "Not allowed." };
    }

    const meId = user.id;
    const opponentId = isAi
      ? null
      : meId === duel.student_id
        ? duel.opponent_student_id
        : duel.student_id;

    const me = await getLearnerPreview(admin, meId);
    const opponent = opponentId
      ? await getLearnerPreview(admin, opponentId)
      : {
          id: null,
          name: "Sparring Quest",
          avatarUrl: null,
          bio: "Adaptive duel sparring partner",
          totalXp: null,
          clan: null,
        };

    return {
      success: true,
      preview: {
        duelId: duel.id,
        divisionKey: duel.division_key,
        me,
        opponent: {
          ...opponent,
          isAi,
        },
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load matchup.",
    };
  }
}


export async function getDuelForUser(
  duelId: string
): Promise<DuelPublicRow | { error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student" && user.role !== "admin") {
      return { error: "Not allowed." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { error: "Invalid duel." };

    const admin = createAdminClient();
    const { data: duel, error } = await admin
      .from("skill_duels")
      .select("*")
      .eq("id", id.id)
      .maybeSingle();

    if (error || !duel) return { error: "Duel not found." };

    const isAi = (duel as { is_ai_opponent?: boolean }).is_ai_opponent === true;
    const isParticipant =
      duel.student_id === user.id ||
      (!isAi && duel.opponent_student_id === user.id);
    if (!isParticipant) {
      return { error: "Not allowed." };
    }

    const raw = duel.questions as unknown as SkillDuelQuestion[];
    const showAnswers = duel.status === "completed";

    const publicQs = Array.isArray(raw)
      ? raw.map((q) => ({
          prompt: q.prompt,
          choices: q.choices,
          type: q.type,
          ...(showAnswers ? { correctIndex: q.correctIndex } : {}),
        }))
      : [];

    const sa = duel.student_answers as number[] | null;
    const oa = duel.opponent_answers as number[] | null;
    let student_running: number | undefined;
    let opponent_running: number | undefined;
    if (duel.status === "active" && Array.isArray(raw) && raw.length > 0) {
      student_running = 0;
      if (sa && sa.length > 0) {
        for (let i = 0; i < sa.length; i++) {
          const q = raw[i];
          const a = sa[i];
          if (q && typeof a === "number" && a >= 0 && a === q.correctIndex) {
            student_running += 1;
          }
        }
      }
      opponent_running = 0;
      if (oa && oa.length > 0) {
        for (let i = 0; i < oa.length; i++) {
          const q = raw[i];
          const a = oa[i];
          if (q && typeof a === "number" && a >= 0 && a === q.correctIndex) {
            opponent_running += 1;
          }
        }
      }
    }

    return {
      id: duel.id,
      student_id: duel.student_id,
      opponent_student_id: duel.opponent_student_id,
      initiator_id: (duel as { initiator_id?: string | null }).initiator_id ?? null,
      division_key: duel.division_key,
      status: duel.status,
      match_source: (duel as { match_source?: string | null }).match_source ?? null,
      is_ai_opponent: isAi,
      questions: publicQs as DuelPublicRow["questions"],
      fullQuestions: showAnswers ? raw : undefined,
      student_answers: sa,
      opponent_answers: oa,
      student_running_score: student_running,
      opponent_running_score: opponent_running,
      student_score: duel.student_score,
      opponent_score: duel.opponent_score,
      winner: duel.winner,
      reward_amount_cents: duel.reward_amount_cents ?? 0,
      created_at: duel.created_at,
      completed_at: duel.completed_at,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listStudentDuels(): Promise<
  {
    id: string;
    student_id: string;
    opponent_student_id: string | null;
    division_key: string;
    status: string;
    created_at: string;
    initiator_id: string | null;
    is_ai_opponent: boolean;
  }[]
> {
  const user = await requireRole(["student", "admin"]);
  if (user.role !== "student") return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("skill_duels")
    .select(
      "id, student_id, opponent_student_id, division_key, status, created_at, initiator_id, is_ai_opponent, challenger_hidden_at, opponent_hidden_at"
    )
    .or(`student_id.eq.${user.id},opponent_student_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(80);

  type Row = {
    id: string;
    student_id: string;
    opponent_student_id: string | null;
    division_key: string;
    status: string;
    created_at: string;
    initiator_id: string | null;
    is_ai_opponent: boolean;
    challenger_hidden_at: string | null;
    opponent_hidden_at: string | null;
  };

  const raw = (data ?? []) as Row[];
  const visible = raw.filter((r) => {
    if (r.student_id === user.id && r.challenger_hidden_at) return false;
    if (r.opponent_student_id === user.id && r.opponent_hidden_at) return false;
    return true;
  });

  return visible.slice(0, 50).map(
    ({
      challenger_hidden_at: _c,
      opponent_hidden_at: _o,
      ...rest
    }) => rest
  ) as {
    id: string;
    student_id: string;
    opponent_student_id: string | null;
    division_key: string;
    status: string;
    created_at: string;
    initiator_id: string | null;
    is_ai_opponent: boolean;
  }[];
}

export type DuelHistorySummary = {
  totalCompleted: number;
  wins: number;
  losses: number;
  ties: number;
  xpFromDuels: number;
  byDivision: { division_key: string; played: number; wins: number }[];
};

export async function getDuelHistorySummary(): Promise<DuelHistorySummary | { error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { error: "Not allowed." };
    }

    const admin = createAdminClient();
    const { data: duels } = await admin
      .from("skill_duels")
      .select(
        "winner, student_id, opponent_student_id, division_key, status, is_ai_opponent"
      )
      .or(`student_id.eq.${user.id},opponent_student_id.eq.${user.id}`)
      .eq("status", "completed");

    const { data: ledger } = await admin
      .from("xp_award_ledger")
      .select("xp_amount, award_key")
      .eq("user_id", user.id)
      .like("award_key", "duel_%");

    let xpFromDuels = 0;
    for (const row of ledger ?? []) {
      const k = row.award_key ?? "";
      if (
        k.startsWith("duel_win:") ||
        k.startsWith("duel_loss:") ||
        k.startsWith("duel_tie:") ||
        k.startsWith("duel_streak_fire:")
      ) {
        xpFromDuels += row.xp_amount ?? 0;
      }
    }

    let wins = 0;
    let losses = 0;
    let ties = 0;
    const divMap = new Map<string, { played: number; wins: number }>();

    for (const d of duels ?? []) {
      const asStudent = d.student_id === user.id;
      const w = d.winner;

      const cur = divMap.get(d.division_key) ?? { played: 0, wins: 0 };
      cur.played += 1;

      if (w === "tie") {
        ties += 1;
        divMap.set(d.division_key, cur);
        continue;
      }

      let iWon = false;
      if (w === "student") iWon = asStudent;
      else if (w === "opponent")
        iWon = !asStudent && d.opponent_student_id === user.id;

      if (iWon) {
        wins += 1;
        cur.wins += 1;
      } else {
        losses += 1;
      }
      divMap.set(d.division_key, cur);
    }

    const byDivision = Array.from(divMap.entries()).map(([division_key, v]) => ({
      division_key,
      played: v.played,
      wins: v.wins,
    }));

    return {
      totalCompleted: (duels ?? []).length,
      wins,
      losses,
      ties,
      xpFromDuels,
      byDivision,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}
