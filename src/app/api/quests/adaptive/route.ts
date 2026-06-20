import { NextResponse } from "next/server";
import { getCurrentUser } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";
import { getClientIpFromRequest } from "@/shared/core/security";
import {
  generateAdaptiveTurn,
  buildAdaptiveTurnFallback,
  type AdaptiveTurnResponse,
  type AdaptiveWorldState,
} from "@/shared/integrations/ai/adaptive-quest";
import { adaptiveTurnRequestSchema } from "@/features/quest/adaptive-classic-quest-schemas";
import type { AdaptiveClassicMetadata } from "@/features/quest/adaptive-classic-quest-schemas";
import { normalizePriorWorldState } from "@/features/quest/adaptive-quest-steps";
import { persistAdaptiveTurnState } from "@/features/quest/adaptive-classic-quest";
import {
  isQuestHardLimitMessage,
  normalizeQuestSolverErrorMessage,
} from "@/features/quest/quest-internal";

export const dynamic = "force-dynamic";

function resolveAdaptiveTurn(
  generated: Awaited<ReturnType<typeof generateAdaptiveTurn>>,
  message: string,
  priorWorldState: AdaptiveWorldState | null,
  problemPrompt: string
): AdaptiveTurnResponse {
  if ("error" in generated && generated.error) {
    if (isQuestHardLimitMessage(generated.message)) {
      throw new Error(normalizeQuestSolverErrorMessage(generated.message));
    }
    return buildAdaptiveTurnFallback(message, priorWorldState, problemPrompt);
  }
  return generated as AdaptiveTurnResponse;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIpFromRequest({ headers: req.headers });
    const routeBlocked = await enforceApiRouteRateLimit("quest.adaptive", {
      ip,
      userId: user.id,
    });
    if (routeBlocked) return routeBlocked;

    const body = await req.json();
    const parsed = adaptiveTurnRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { questId, message, priorWorldState, subject } = parsed.data;
    const admin = createAdminClient();

    const { data: quest } = await admin
      .from("quests")
      .select("id, creator_user_id, metadata")
      .eq("id", questId)
      .maybeSingle();

    if (!quest || quest.creator_user_id !== user.id) {
      return NextResponse.json({ error: "Quest not found." }, { status: 404 });
    }

    const meta = quest.metadata as Partial<AdaptiveClassicMetadata> | null;
    if (!meta?.adaptiveChallenge) {
      return NextResponse.json({ error: "Quest is not an adaptive challenge." }, { status: 400 });
    }

    const problemPrompt =
      typeof meta.initialPrompt === "string" && meta.initialPrompt.trim()
        ? meta.initialPrompt.trim()
        : message;

    const normalizedPrior = normalizePriorWorldState(priorWorldState, problemPrompt);

    const generated = await generateAdaptiveTurn(
      { subject, problemPrompt, message, priorWorldState: normalizedPrior },
      user.id
    );

    const result = resolveAdaptiveTurn(generated, message, normalizedPrior, problemPrompt);

    await persistAdaptiveTurnState(
      questId,
      user.id,
      result.feedback,
      result.updatedWorldState
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = normalizeQuestSolverErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
