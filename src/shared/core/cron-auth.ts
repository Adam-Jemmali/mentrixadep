import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const DEFAULT_SIGNATURE_TTL_SEC = 300;

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
  const expected = buildCronRequestSignature(
    secret,
    request.method,
    url.pathname,
    timestampMs,
  );

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

/** HMAC signature for x-cron-timestamp / x-cron-signature headers (GitHub Actions ping script). */
export function buildCronRequestSignature(
  secret: string,
  method: string,
  pathname: string,
  timestampMs: number,
): string {
  const payload = `${timestampMs}.${method.toUpperCase()}.${pathname}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function readProvidedCronSecret(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = (request.headers.get("x-cron-secret") ?? "").trim();
  return bearer || headerSecret;
}

function cronSecretsMatch(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
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
  const provided = readProvidedCronSecret(request);
  if (!cronSecretsMatch(secret, provided)) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Bearer / x-cron-secret is sufficient for schedulers (Vercel cron, GitHub Actions).
  const hasSigHeaders =
    !!request.headers.get("x-cron-timestamp") || !!request.headers.get("x-cron-signature");
  if (hasSigHeaders) {
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

export function cronGetHandler(
  job: string,
  handler: () => Promise<CronResult>,
): (request: Request) => Promise<NextResponse> {
  return async (request: Request) => {
    const auth = authorizeCronRequest(request);
    if (!auth.ok) return auth.response;
    return runCronJob(job, handler);
  };
}

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
