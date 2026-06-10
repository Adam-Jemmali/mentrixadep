import { NextResponse } from "next/server";
import { createAccountLink } from "@/features/payments/connect-onboarding";

export const dynamic = "force-dynamic";

function isNextRedirectError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("digest" in err)) return false;
  const digest = (err as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT;");
}

export async function POST() {
  try {
    const { url } = await createAccountLink();
    return NextResponse.json({ url });
  } catch (err) {
    if (isNextRedirectError(err)) {
      throw err;
    }
    console.error("[stripe/connect/create]", err);
    const message = err instanceof Error ? err.message : "Failed to create onboarding link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
