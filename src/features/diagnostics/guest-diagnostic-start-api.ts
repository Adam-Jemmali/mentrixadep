import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIpFromRequest } from "@/shared/core/security";
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";
import { AP_CALC_AB_UNAVAILABLE_MESSAGE } from "@/features/quest/ap-calc-ab-subject";
import { selectGuestStepTraceItem } from "@/features/diagnostics/select-guest-step-trace-item";
import {
  buildGuestTrySessionPayload,
  guestTrySessionCookieHeader,
  readGuestTrySessionCookie,
  sealGuestTrySession,
  sessionPayloadToProblem,
} from "@/features/diagnostics/guest-try-session";

function parseGuestDailyCookie(raw: string | null) {
  if (!raw) return { date: null, count: 0 };
  try {
    const v = JSON.parse(raw) as { date?: string; count?: number };
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

const ENFORCE_GUEST_DAILY_LIMIT = process.env.NODE_ENV === "production";

const resumeBodySchema = z.object({
  resume: z.literal(true).optional(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIpFromRequest({ headers: req.headers });
    const cookieHeader = req.headers.get("cookie");
    const body = resumeBodySchema.safeParse(await req.json().catch(() => ({})));
    const wantsResume = body.success && body.data.resume === true;

    if (wantsResume) {
      const existing = readGuestTrySessionCookie(cookieHeader);
      if (existing) {
        return NextResponse.json({
          success: true,
          resumed: true,
          problem: sessionPayloadToProblem(existing),
          unitNumber: existing.unitNumber,
          unitName: existing.unitName,
          nodeSlug: existing.nodeSlug,
        });
      }
      // Page load resume probe — never starts a session or counts toward limits.
      return NextResponse.json({ success: true, resumed: false });
    }

    const routeBlocked = await enforceApiRouteRateLimit("guest.diagnostic", { ip });
    if (routeBlocked) return routeBlocked;

    let guestQuestCount = 0;
    const guestQuestMatch = cookieHeader?.match(/guest_quests=([^;]+)/);
    const guestQuestRaw = guestQuestMatch?.[1]
      ? decodeURIComponent(guestQuestMatch[1])
      : null;
    const parsedDaily = parseGuestDailyCookie(guestQuestRaw);
    const today = todayIso();
    if (parsedDaily.date === today) guestQuestCount = parsedDaily.count;

    if (ENFORCE_GUEST_DAILY_LIMIT && guestQuestCount >= 3) {
      return NextResponse.json(
        { success: false, error: "Daily demo limit reached (3). Try again tomorrow." },
        { status: 429 },
      );
    }

    const selected = await selectGuestStepTraceItem();
    if (!selected) {
      return NextResponse.json(
        { success: false, error: AP_CALC_AB_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }

    const session = buildGuestTrySessionPayload({
      itemId: selected.itemId,
      prompt: selected.prompt,
      stepSequence: selected.stepSequence,
      skillNodeId: selected.skillNodeId!,
      nodeName: selected.nodeName!,
      unitNumber: selected.unitNumber,
      unitName: selected.unitName,
      nodeSlug: selected.nodeSlug,
      examStakes: selected.examStakes,
    });

    const token = sealGuestTrySession(session);
    const nextDaily = {
      date: today,
      count: ENFORCE_GUEST_DAILY_LIMIT ? guestQuestCount + 1 : 0,
    };

    const res = NextResponse.json({
      success: true,
      resumed: false,
      problem: sessionPayloadToProblem(session),
      unitNumber: session.unitNumber,
      unitName: session.unitName,
      nodeSlug: session.nodeSlug,
    });

    res.headers.append("Set-Cookie", guestTrySessionCookieHeader(token));
    res.headers.append(
      "Set-Cookie",
      `guest_quests=${encodeURIComponent(JSON.stringify(nextDaily))}; Path=/; Max-Age=86400; SameSite=Lax`,
    );
    return res;
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown" },
      { status: 500 },
    );
  }
}
