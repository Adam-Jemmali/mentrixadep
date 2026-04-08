type CaptchaResult = { ok: true } | { ok: false; reason: string };

function getTurnstileSecret(): string | null {
  const v = process.env.TURNSTILE_SECRET_KEY?.trim();
  return v ? v : null;
}

export function isCaptchaConfigured(): boolean {
  return !!getTurnstileSecret();
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<CaptchaResult> {
  const secret = getTurnstileSecret();
  if (!secret) return { ok: true };
  if (!token || !token.trim()) return { ok: false, reason: "captcha_required" };

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token.trim());
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, reason: "captcha_verify_failed" };
    const data = (await res.json()) as { success?: boolean };
    if (data.success === true) return { ok: true };
    return { ok: false, reason: "captcha_failed" };
  } catch {
    return { ok: false, reason: "captcha_verify_failed" };
  }
}

