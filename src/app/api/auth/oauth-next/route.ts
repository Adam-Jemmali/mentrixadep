import { NextResponse } from "next/server";
import { getPostOAuthRedirectPath } from "@/app/actions/auth";

/**
 * JSON bridge after Google Identity Services `signInWithIdToken`.
 * Avoids calling a Server Action from the client (Next 16+ can surface
 * "An unexpected response was received from the server" when the RSC/action
 * response is not what the action client expects).
 */
export async function POST() {
  try {
    const result = await getPostOAuthRedirectPath();
    const status = "error" in result ? 422 : 200;
    return NextResponse.json(result, { status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
