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

type GuestFallbackQuestion = {
  id: string;
  kind: "mcq";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

function buildGuestFallbackMcqPack(subject: string): GuestFallbackQuestion[] {
  const s = subject.trim() || "General";
  return [
    {
      id: "q0",
      kind: "mcq",
      prompt: `In ${s}, which study approach usually improves retention the most over time?`,
      options: [
        "One long cram session before a deadline",
        "Spaced practice over multiple short sessions",
        "Only reading notes once",
        "Skipping review after solving questions",
      ],
      correctIndex: 1,
      explanation: "Spaced repetition improves long-term recall more reliably than cramming.",
    },
    {
      id: "q1",
      kind: "mcq",
      prompt: `When solving a hard ${s} problem, what should you do first?`,
      options: [
        "Guess quickly and move on",
        "Rewrite the question in your own words and list knowns/unknowns",
        "Search for the final answer immediately",
        "Ignore constraints and assumptions",
      ],
      correctIndex: 1,
      explanation: "Clarifying the problem statement and constraints reduces avoidable mistakes.",
    },
    {
      id: "q2",
      kind: "mcq",
      prompt: `Which feedback loop helps you improve fastest in ${s}?`,
      options: [
        "Solve many questions without checking errors",
        "Review only correct answers",
        "Analyze mistakes and retry similar questions",
        "Avoid timed practice completely",
      ],
      correctIndex: 2,
      explanation: "Targeted error review and deliberate retry builds durable skill growth.",
    },
    {
      id: "q3",
      kind: "mcq",
      prompt: `For beginner practice in ${s}, what is the best sequence?`,
      options: [
        "Hard problems first, basics later",
        "Memorize answers, skip reasoning",
        "Foundations first, then progressively harder mixed practice",
        "Random topics with no progression",
      ],
      correctIndex: 2,
      explanation: "Progressive difficulty with a strong foundation prevents fragile understanding.",
    },
    {
      id: "q4",
      kind: "mcq",
      prompt: `If you have 20 minutes to prepare for a ${s} quiz, what is highest impact?`,
      options: [
        "Passive rereading only",
        "Active recall: quick self-test and explain one concept aloud",
        "Open social media between each question",
        "Skip checking why answers are wrong",
      ],
      correctIndex: 1,
      explanation: "Active recall and self-explanation are high-yield under time constraints.",
    },
  ];
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

    const questions =
      "error" in gen
        ? buildGuestFallbackMcqPack(subject.slice(0, 120))
        : gen.questions;

    // increment cookie
    const next = { date: today, count: count + 1 };
    const res = NextResponse.json({ success: true, questions });
    res.headers.set("Set-Cookie", `guest_quests=${encodeURIComponent(JSON.stringify(next))}; Path=/; Max-Age=86400; SameSite=Lax`);
    return res;
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
