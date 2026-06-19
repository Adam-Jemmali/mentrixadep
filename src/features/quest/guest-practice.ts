import { NextResponse } from "next/server";
import { getClientIpFromRequest } from "@/shared/core/security";
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";
import { generateGuestTryQuestPack, hydrateGuestTryQuestionImages } from "@/shared/integrations/ai";
import {
  isPlayableGuestTryQuestion,
  type GuestTryQuestion,
} from "@/features/quest/guest-try-types";
import { buildGuestMixedFallbackPack } from "@/features/quest/guest-mixed-fallback";
import {
  AP_CALC_AB_UNAVAILABLE_MESSAGE,
  isApCalculusAbSubject,
} from "@/features/quest/ap-calc-ab-subject";
import {
  GUEST_AP_CALC_TRY_COUNT,
  selectGuestTryItemBankQuestions,
} from "@/features/quest/guest-item-bank-selector";
import { shuffleGuestTryPack } from "@/features/quest/guest-try-shuffle";

function parseGuestCookie(raw: string | null) {
  if (!raw) return { date: null, count: 0 };
  try {
    const v = JSON.parse(raw);
    return { date: v.date ?? null, count: Number(v.count ?? 0) };
  } catch {
    return { date: null, count: 0 };
  }
}

function todayIso() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const TRY_QUEST_COUNT = 5;
const ENFORCE_GUEST_DAILY_LIMIT = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  try {
    const ip = getClientIpFromRequest({ headers: req.headers });
    const routeBlocked = await enforceApiRouteRateLimit("guest.practice", { ip });
    if (routeBlocked) return routeBlocked;

    const body = await req.json();
    const subject = typeof body?.subject === "string" ? body.subject : "General";

    const cookieHeader = req.headers.get("cookie");
    let guestCookieValue: string | null = null;
    if (cookieHeader) {
      const m = cookieHeader.match(/guest_quests=([^;]+)/);
      if (m?.[1]) guestCookieValue = decodeURIComponent(m[1]);
    }

    const parsed = parseGuestCookie(guestCookieValue);
    const today = todayIso();
    let count = 0;
    if (parsed.date === today) count = parsed.count;
    if (ENFORCE_GUEST_DAILY_LIMIT && count >= 3) {
      return NextResponse.json(
        { success: false, error: "Daily demo limit reached (3). Try again tomorrow." },
        { status: 429 },
      );
    }

    const subjectTrim = subject.slice(0, 120);
    let questions: GuestTryQuestion[];

    if (isApCalculusAbSubject(subjectTrim)) {
      const bankQuestions = await selectGuestTryItemBankQuestions();
      if (bankQuestions.length < GUEST_AP_CALC_TRY_COUNT) {
        return NextResponse.json(
          { success: false, error: AP_CALC_AB_UNAVAILABLE_MESSAGE },
          { status: 503 },
        );
      }
      questions = bankQuestions.filter(isPlayableGuestTryQuestion);
      if (questions.length < GUEST_AP_CALC_TRY_COUNT) {
        return NextResponse.json(
          { success: false, error: AP_CALC_AB_UNAVAILABLE_MESSAGE },
          { status: 503 },
        );
      }
    } else {
      const gen = await generateGuestTryQuestPack({
        subject: subjectTrim,
        difficulty: "advanced",
        questionCount: TRY_QUEST_COUNT,
      });

      if (!("error" in gen) && gen.questions.length >= TRY_QUEST_COUNT) {
        questions = gen.questions.slice(0, TRY_QUEST_COUNT).filter(isPlayableGuestTryQuestion);
      } else {
        questions = [];
      }
      if (questions.length < TRY_QUEST_COUNT) {
        questions = buildGuestMixedFallbackPack(subjectTrim);
      }
      const hydrated = await hydrateGuestTryQuestionImages(subjectTrim, questions);
      questions = "error" in hydrated ? questions : hydrated.questions;
    }

    questions = shuffleGuestTryPack(questions);

    const next = { date: today, count: ENFORCE_GUEST_DAILY_LIMIT ? count + 1 : 0 };
    const res = NextResponse.json({ success: true, questions });
    res.headers.set(
      "Set-Cookie",
      `guest_quests=${encodeURIComponent(JSON.stringify(next))}; Path=/; Max-Age=86400; SameSite=Lax`,
    );
    return res;
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown" },
      { status: 500 },
    );
  }
}
