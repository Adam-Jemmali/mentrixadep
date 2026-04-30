import { NextResponse } from "next/server";
import { generatePracticeQuestPackGuest } from "@/lib/ai";
import type { PracticeDifficulty, PracticePackType } from "@/lib/practice-quest-types";

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

const DIFFICULTIES: PracticeDifficulty[] = ["beginner", "intermediate", "advanced"];
const PACK_TYPES: PracticePackType[] = ["mcq", "short_answer", "problem_solving"];

function asPracticeDifficulty(value: unknown): PracticeDifficulty {
  return typeof value === "string" && DIFFICULTIES.includes(value as PracticeDifficulty)
    ? (value as PracticeDifficulty)
    : "beginner";
}

function asPracticePackType(value: unknown): PracticePackType {
  return typeof value === "string" && PACK_TYPES.includes(value as PracticePackType)
    ? (value as PracticePackType)
    : "mcq";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const subject = typeof body?.subject === "string" ? body.subject : "General";
    const difficulty = asPracticeDifficulty(body?.difficulty);
    const packType = asPracticePackType(body?.packType);

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
    if (count >= 3) {
      return NextResponse.json(
        { success: false, error: "Daily demo limit reached (3). Try again tomorrow." },
        { status: 429 },
      );
    }

    // Generate a 5-question pack for guest
    const gen = await generatePracticeQuestPackGuest({
      subject: subject.slice(0, 120),
      difficulty,
      packType,
      questionCount: 5,
    });

    if ("error" in gen) {
      return NextResponse.json({ success: false, error: gen.message }, { status: 500 });
    }

    // increment cookie
    const next = { date: today, count: count + 1 };
    const res = NextResponse.json({ success: true, questions: gen.questions });
    res.headers.set("Set-Cookie", `guest_quests=${encodeURIComponent(JSON.stringify(next))}; Path=/; Max-Age=86400; SameSite=Lax`);
    return res;
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
