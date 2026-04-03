import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const DEFAULT_SIGNATURE_TTL_SEC = 300;

function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  return real || null;
}

function verifySignature(
  request: Request,
  secret: string,
): { ok: true } | { ok: false; reason: string } {
  const timestamp = request.headers.get("x-cron-timestamp");
  const signature = request.headers.get("x-cron-signature");
  if (!timestamp || !signature) {
    return { ok: false, reason: "Missing cron signature headers." };
  }

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs)) {
    return { ok: false, reason: "Invalid cron timestamp." };
  }

  const now = Date.now();
  const ageSec = Math.abs(now - timestampMs) / 1000;
  if (ageSec > DEFAULT_SIGNATURE_TTL_SEC) {
    return { ok: false, reason: "Expired cron signature." };
  }

  const url = new URL(request.url);
  const payload = `${timestamp}.${request.method.toUpperCase()}.${url.pathname}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signature.trim().toLowerCase());
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: "Invalid cron signature." };
  }
  if (!timingSafeEqual(expectedBuf, providedBuf)) {
    return { ok: false, reason: "Invalid cron signature." };
  }
  return { ok: true };
}

export function authorizeCronRequest(
  request: Request,
): { ok: true } | { ok: false; response: NextResponse } {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Cron is not configured." }, { status: 503 }),
    };
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const rawAllowlist = (process.env.CRON_ALLOWED_IPS ?? "").trim();
  if (rawAllowlist) {
    const ip = getRequestIp(request);
    const allowed = new Set(
      rawAllowlist
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    );
    if (!ip || !allowed.has(ip)) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
  }

  const requireSig = (process.env.CRON_REQUIRE_SIGNATURE ?? "false").toLowerCase() === "true";
  const hasSigHeaders =
    !!request.headers.get("x-cron-timestamp") || !!request.headers.get("x-cron-signature");
  if (requireSig || hasSigHeaders) {
    const sig = verifySignature(request, secret);
    if (!sig.ok) {
      return { ok: false, response: NextResponse.json({ error: sig.reason }, { status: 401 }) };
    }
  }

  return { ok: true };
}

type CronResult = {
  rows_scanned?: number;
  rows_updated?: number;
  rows_created?: number;
  rows_failed?: number;
  [key: string]: unknown;
};

export async function runCronJob(
  job: string,
  handler: () => Promise<CronResult>,
): Promise<NextResponse> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  console.info(`[cron] start`, { job, started_at: startedAt });

  try {
    const result = await handler();
    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;
    console.info(`[cron] finish`, {
      job,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: durationMs,
      status: "ok",
      rows_scanned: result.rows_scanned ?? 0,
      rows_updated: result.rows_updated ?? 0,
      rows_created: result.rows_created ?? 0,
      rows_failed: result.rows_failed ?? 0,
    });
    return NextResponse.json({
      job,
      status: "ok",
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: durationMs,
      ...result,
    });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;
    console.error(`[cron] fail`, {
      job,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: durationMs,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        job,
        status: "error",
        started_at: startedAt,
        finished_at: finishedAt,
        duration_ms: durationMs,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
