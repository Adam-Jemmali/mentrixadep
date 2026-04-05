import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enforceSlidingRateLimit,
  RATE_LIMITS,
  getRateLimitId,
  validateUUID,
} from "@/lib/security";
import { streamStudioSessionPackageText } from "@/lib/ai";
import { parseStudioPackageFromModelText } from "@/lib/studio-package";
import {
  buildSessionPackageRichContext,
  persistStudioDraftFromNormalized,
} from "@/app/actions/autoPilot";

const END_MARKER = "\n__MENTRIXA_STUDIO_END__";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "tutor" && user.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await enforceSlidingRateLimit(
    getRateLimitId(user.id),
    RATE_LIMITS.questAi,
    "tutor.studio-stream"
  );

  let body: {
    sessionId?: string;
    tutorContext?: string;
    onBehalfOfTutorId?: string;
    isRegenerate?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionIdRaw = body.sessionId;
  if (!sessionIdRaw) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  let validSessionId: string;
  try {
    validSessionId = validateUUID(sessionIdRaw);
  } catch {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const tutorContext =
    typeof body.tutorContext === "string" ? body.tutorContext.slice(0, 4000) : undefined;
  const onBehalfOfTutorId =
    user.role === "admin" && typeof body.onBehalfOfTutorId === "string"
      ? body.onBehalfOfTutorId
      : undefined;
  const isRegenerate = Boolean(body.isRegenerate);

  const adminClient = createAdminClient();

  const { data: session, error: sErr } = await adminClient
    .from("sessions")
    .select("id, tutor_id, course, start_time, end_time, student_id")
    .eq("id", validSessionId)
    .maybeSingle();

  if (sErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const targetTutorId =
    user.role === "admin" && onBehalfOfTutorId ? onBehalfOfTutorId : user.id;

  if (session.tutor_id !== targetTutorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: existingPkg } = await adminClient
    .from("session_ai_packages")
    .select("package_published_at, studio_regenerate_count")
    .eq("session_id", validSessionId)
    .maybeSingle();

  if (isRegenerate) {
    if (!existingPkg) {
      return NextResponse.json({ error: "Nothing to regenerate" }, { status: 400 });
    }
    if ((existingPkg.studio_regenerate_count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Regenerate limit reached (3 per session)." },
        { status: 429 },
      );
    }
  } else if (existingPkg?.package_published_at) {
    return NextResponse.json(
      { error: "A published package already exists for this session." },
      { status: 400 },
    );
  }

  const richContext = await buildSessionPackageRichContext(
    adminClient,
    validSessionId,
    session,
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let acc = "";
        for await (const chunk of streamStudioSessionPackageText(
          richContext,
          tutorContext,
          user.id,
        )) {
          acc += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        const parsed = parseStudioPackageFromModelText(acc);
        if ("error" in parsed) {
          controller.enqueue(
            encoder.encode(`${END_MARKER}${JSON.stringify({ ok: false, error: parsed.error })}`),
          );
          controller.close();
          return;
        }

        const persist = await persistStudioDraftFromNormalized(validSessionId, parsed, {
          isRegenerate,
          onBehalfOfTutorId,
        });

        if ("error" in persist) {
          controller.enqueue(
            encoder.encode(`${END_MARKER}${JSON.stringify({ ok: false, error: persist.error })}`),
          );
          controller.close();
          return;
        }

        controller.enqueue(
          encoder.encode(
            `${END_MARKER}${JSON.stringify({ ok: true, sessionId: validSessionId })}`,
          ),
        );
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Generation failed";
        controller.enqueue(encoder.encode(`${END_MARKER}${JSON.stringify({ ok: false, error: msg })}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
