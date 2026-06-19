import { NextResponse } from "next/server";
import { getClientIpFromRequest } from "@/shared/core/security";
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";
import {
  generateExplanation,
  evaluateAnswer,
  type QuestExplanationResponse,
  type EvaluateAnswerResponse,
} from "@/shared/integrations/ai";
import {
  generateAdaptiveTurn,
  buildAdaptiveTurnFallback,
  type AdaptiveWorldState,
  type AdaptiveTurnResponse,
} from "@/shared/integrations/ai/adaptive-quest";
import { adaptiveTurnRequestSchema } from "@/features/quest/adaptive-classic-quest-schemas";
import { normalizePriorWorldState } from "@/features/quest/adaptive-quest-steps";
import {
  buildQuestFallbackResponse,
  fallbackEvaluateQuestAnswer,
  submitAnswerSchema,
  submitQuestSchema,
  type QuestGoal,
  type QuestMode,
} from "@/features/quest/quest-internal";
import { XP } from "@/features/xp/xp-constants";

const GUEST_CLASSIC_COOKIE = "guest_classic_v1";
const GUEST_ADAPTIVE_COOKIE = "guest_adaptive_v1";
const MAX_STORED = 8;
const MAX_AGE_MS = 30 * 60 * 1000;
const ENFORCE_GUEST_DAILY_LIMIT = process.env.NODE_ENV === "production";
const GUEST_CLASSIC_DAILY_LIMIT = 1;
const GUEST_CLASSIC_LIMIT_MESSAGE =
  "You have used today's problem solver preview. Try a practice pack or sign up for unlimited access.";

type GuestClassicEntry = {
  id: string;
  prompt: string;
  solution: string;
  goal: QuestGoal;
  mode: QuestMode;
  savedAt: number;
};

type GuestAdaptiveEntry = {
  id: string;
  goal: QuestGoal;
  mode: QuestMode;
  subject: string;
  initialPrompt: string;
  worldState: AdaptiveWorldState | null;
  feedbackHistory: string[];
  savedAt: number;
};

type GuestClassicDaily = { date: string | null; count: number };

function todayIso() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function parseDailyCookie(raw: string | null): GuestClassicDaily {
  if (!raw) return { date: null, count: 0 };
  try {
    const v = JSON.parse(raw) as GuestClassicDaily;
    return { date: v.date ?? null, count: Number(v.count ?? 0) };
  } catch {
    return { date: null, count: 0 };
  }
}

function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function readStoredQuests(raw: string | null): GuestClassicEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as GuestClassicEntry[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.solution === "string" &&
        typeof e.prompt === "string" &&
        now - Number(e.savedAt ?? 0) < MAX_AGE_MS,
    );
  } catch {
    return [];
  }
}

function readStoredAdaptive(raw: string | null): GuestAdaptiveEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as GuestAdaptiveEntry[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.initialPrompt === "string" &&
        now - Number(e.savedAt ?? 0) < MAX_AGE_MS,
    );
  } catch {
    return [];
  }
}

function appendCookie(res: NextResponse, name: string, value: string, httpOnly = false) {
  res.headers.append(
    "Set-Cookie",
    `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=1800; SameSite=Lax${httpOnly ? "; HttpOnly" : ""}`,
  );
}

function guestUserId(ip: string) {
  return `guest:${ip}`;
}

async function resolveExplanation(
  prompt: string,
  goal: QuestGoal,
  mode: QuestMode,
  userId: string,
): Promise<QuestExplanationResponse | { error: true; message: string }> {
  const generated = await generateExplanation({ prompt, goal, mode }, userId);
  if ("error" in generated && generated.error) {
    return buildQuestFallbackResponse(prompt, goal, mode);
  }
  return generated as QuestExplanationResponse;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIpFromRequest({ headers: req.headers });
    const routeBlocked = await enforceApiRouteRateLimit("guest.classic", { ip });
    if (routeBlocked) return routeBlocked;

    const cookieHeader = req.headers.get("cookie");
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "submit";

    if (action === "adaptive_start") {
      const validated = submitQuestSchema.parse({
        prompt: body?.prompt,
        goal: body?.goal,
        mode: body?.mode,
      });
      const subject =
        typeof body?.subject === "string" && body.subject.trim()
          ? body.subject.trim().slice(0, 120)
          : "General";

      const questId = crypto.randomUUID();
      const entry: GuestAdaptiveEntry = {
        id: questId,
        goal: validated.goal,
        mode: validated.mode,
        subject,
        initialPrompt: validated.prompt.trim(),
        worldState: null,
        feedbackHistory: [],
        savedAt: Date.now(),
      };

      const nextStored = [
        entry,
        ...readStoredAdaptive(readCookieValue(cookieHeader, GUEST_ADAPTIVE_COOKIE)),
      ].slice(0, MAX_STORED);

      const res = NextResponse.json({ questId });
      appendCookie(res, GUEST_ADAPTIVE_COOKIE, JSON.stringify(nextStored), true);
      return res;
    }

    if (action === "adaptive_turn") {
      const parsed = adaptiveTurnRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
      }

      const { questId, message, priorWorldState, subject } = parsed.data;
      const stored = readStoredAdaptive(readCookieValue(cookieHeader, GUEST_ADAPTIVE_COOKIE));
      const entry = stored.find((e) => e.id === questId);
      if (!entry) {
        return NextResponse.json({ error: "Challenge session expired. Start again." }, { status: 404 });
      }

      const normalizedPrior = normalizePriorWorldState(priorWorldState, entry.initialPrompt);

      const generated = await generateAdaptiveTurn(
        {
          subject,
          problemPrompt: entry.initialPrompt,
          message,
          priorWorldState: normalizedPrior,
        },
        guestUserId(ip),
      );

      let result: AdaptiveTurnResponse;
      if ("error" in generated && generated.error) {
        result = buildAdaptiveTurnFallback(message, normalizedPrior, entry.initialPrompt);
      } else {
        result = generated as AdaptiveTurnResponse;
      }

      const history = [...entry.feedbackHistory, result.feedback].slice(-40);
      const updatedEntry: GuestAdaptiveEntry = {
        ...entry,
        worldState: result.updatedWorldState,
        feedbackHistory: history,
        savedAt: Date.now(),
      };
      const nextStored = [updatedEntry, ...stored.filter((e) => e.id !== questId)].slice(0, MAX_STORED);

      const res = NextResponse.json(result);
      appendCookie(res, GUEST_ADAPTIVE_COOKIE, JSON.stringify(nextStored), true);
      return res;
    }

    if (action === "adaptive_complete") {
      const questId = typeof body?.questId === "string" ? body.questId : "";
      if (!questId) {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
      }
      const stored = readStoredAdaptive(readCookieValue(cookieHeader, GUEST_ADAPTIVE_COOKIE));
      if (!stored.some((e) => e.id === questId)) {
        return NextResponse.json({ error: "Challenge session expired." }, { status: 404 });
      }

      return NextResponse.json({
        xpAwarded: XP.QUEST_COMPLETE,
        totalXp: XP.QUEST_COMPLETE,
        streakDays: 0,
        preview: true,
      });
    }

    if (action === "grade") {
      const validated = submitAnswerSchema.parse({
        questId: body?.questId,
        userAnswer: body?.userAnswer,
        goal: body?.goal,
        mode: body?.mode,
      });

      const stored = readStoredQuests(readCookieValue(cookieHeader, GUEST_CLASSIC_COOKIE)).find(
        (e) => e.id === validated.questId,
      );
      if (!stored?.solution?.trim()) {
        return NextResponse.json(
          { error: true, message: "Quest session expired. Ask the question again to continue." },
          { status: 404 },
        );
      }

      const evalResult = await evaluateAnswer(
        {
          problem: stored.prompt,
          correctAnswer: stored.solution,
          userAnswer: validated.userAnswer,
          goal: validated.goal,
          mode: validated.mode,
        },
        guestUserId(ip),
      );

      let graded: EvaluateAnswerResponse;
      if ("error" in evalResult && evalResult.error) {
        graded = fallbackEvaluateQuestAnswer(validated.userAnswer, stored.solution);
      } else {
        graded = evalResult as EvaluateAnswerResponse;
      }

      if (!graded.correct) {
        return NextResponse.json({
          correct: false,
          feedback: graded.feedback ?? "Not quite right. Review the hints and try again.",
        });
      }

      return NextResponse.json({
        correct: true,
        feedback: graded.feedback,
        xpAwarded: XP.QUEST_COMPLETE,
        totalXp: XP.QUEST_COMPLETE,
        streakDays: 0,
        preview: true,
      });
    }

    const validated = submitQuestSchema.parse({
      prompt: body?.prompt,
      goal: body?.goal,
      mode: body?.mode,
    });

    const dailyRaw = readCookieValue(cookieHeader, "guest_classic_daily");
    const daily = parseDailyCookie(dailyRaw);
    const today = todayIso();
    let dailyCount = daily.date === today ? daily.count : 0;

    if (ENFORCE_GUEST_DAILY_LIMIT && dailyCount >= GUEST_CLASSIC_DAILY_LIMIT) {
      return NextResponse.json(
        { error: true, message: GUEST_CLASSIC_LIMIT_MESSAGE },
        { status: 429 },
      );
    }

    const result = await resolveExplanation(
      validated.prompt.trim(),
      validated.goal,
      validated.mode,
      guestUserId(ip),
    );

    if ("error" in result && result.error) {
      return NextResponse.json({ error: true, message: result.message }, { status: 429 });
    }

    const { hints, reasoning, finalAnswer } = result as QuestExplanationResponse;
    if (!hints.length) {
      return NextResponse.json(
        {
          error: true,
          message:
            "Quest did not return hints for this problem. Try rephrasing, shortening your question, or try again in a moment.",
        },
        { status: 502 },
      );
    }
    if (!finalAnswer?.trim()) {
      return NextResponse.json(
        {
          error: true,
          message:
            "Quest did not return a gradable answer. Try again, or split your question into a smaller part.",
        },
        { status: 502 },
      );
    }

    const questId = crypto.randomUUID();
    const entry: GuestClassicEntry = {
      id: questId,
      prompt: validated.prompt.trim(),
      solution: finalAnswer,
      goal: validated.goal,
      mode: validated.mode,
      savedAt: Date.now(),
    };

    const nextStored = [entry, ...readStoredQuests(readCookieValue(cookieHeader, GUEST_CLASSIC_COOKIE))]
      .slice(0, MAX_STORED);

    const res = NextResponse.json({
      questId,
      hints,
      reasoning,
      solution: validated.mode === "exam" ? "" : finalAnswer,
      mode: validated.mode,
    });

    res.headers.append(
      "Set-Cookie",
      `${GUEST_CLASSIC_COOKIE}=${encodeURIComponent(JSON.stringify(nextStored))}; Path=/; Max-Age=1800; SameSite=Lax; HttpOnly`,
    );

    if (ENFORCE_GUEST_DAILY_LIMIT) {
      dailyCount += 1;
      res.headers.append(
        "Set-Cookie",
        `guest_classic_daily=${encodeURIComponent(JSON.stringify({ date: today, count: dailyCount }))}; Path=/; Max-Age=86400; SameSite=Lax`,
      );
    }

    return res;
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
