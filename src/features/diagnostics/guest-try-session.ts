import { createHmac, timingSafeEqual } from "node:crypto";
import type { StepTraceSequence } from "@/features/diagnostics/step-trace-types";

export const GUEST_TRY_DIAGNOSTIC_COOKIE = "guest_try_diagnostic";
export const GUEST_TRY_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export type GuestTrySessionPayload = {
  v: 1;
  itemId: string;
  prompt: string;
  stepSequence: StepTraceSequence;
  skillNodeId: string;
  nodeName: string;
  unitNumber: number;
  unitName: string;
  nodeSlug?: string;
  examStakes?: string;
  issuedAt: number;
  expiresAt: number;
};

function getGuestSessionSecret(): string {
  const secret = (process.env.CRON_SECRET ?? process.env.GUEST_SESSION_SECRET ?? "").trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Guest session signing is not configured.");
  }
  return "dev-guest-session-secret";
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getGuestSessionSecret()).update(encodedPayload).digest("base64url");
}

export function sealGuestTrySession(payload: GuestTrySessionPayload): string {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function openGuestTrySession(token: string): GuestTrySessionPayload | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = trimmed.slice(0, dot);
  const providedSig = trimmed.slice(dot + 1);
  const expectedSig = signPayload(encoded);

  const expectedBuf = Buffer.from(expectedSig);
  const providedBuf = Buffer.from(providedSig);
  if (expectedBuf.length !== providedBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, providedBuf)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as GuestTrySessionPayload;
    if (parsed.v !== 1) return null;
    if (!parsed.itemId || !parsed.prompt || !Array.isArray(parsed.stepSequence)) return null;
    if (!parsed.skillNodeId || !parsed.nodeName) return null;
    if (typeof parsed.issuedAt !== "number" || typeof parsed.expiresAt !== "number") return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readGuestTrySessionCookie(cookieHeader: string | null): GuestTrySessionPayload | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`${GUEST_TRY_DIAGNOSTIC_COOKIE}=([^;]+)`),
  );
  if (!match?.[1]) return null;
  return openGuestTrySession(decodeURIComponent(match[1]));
}

export function guestTrySessionCookieHeader(token: string): string {
  return `${GUEST_TRY_DIAGNOSTIC_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${Math.floor(GUEST_TRY_SESSION_TTL_MS / 1000)}; SameSite=Lax; HttpOnly`;
}

export function buildGuestTrySessionPayload(
  input: Omit<GuestTrySessionPayload, "v" | "issuedAt" | "expiresAt">,
): GuestTrySessionPayload {
  const issuedAt = Date.now();
  return {
    v: 1,
    ...input,
    issuedAt,
    expiresAt: issuedAt + GUEST_TRY_SESSION_TTL_MS,
  };
}

export function sessionPayloadToProblem(
  payload: GuestTrySessionPayload,
): import("@/features/diagnostics/step-trace-types").StepTraceProblem {
  return {
    itemId: payload.itemId,
    prompt: payload.prompt,
    stepSequence: payload.stepSequence,
    skillNodeId: payload.skillNodeId,
    nodeName: payload.nodeName,
    examStakes: payload.examStakes,
  };
}
