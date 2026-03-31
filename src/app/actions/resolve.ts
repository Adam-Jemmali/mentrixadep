"use server";

import { randomUUID } from "crypto";
import { requireRole } from "@/lib/auth";
import { sanitizeString } from "@/lib/security";

export type SubmitResolveResult =
  | { problemId: string }
  | { error: true; message: string };

/**
 * Starts a resolve flow: returns a client-side problem id for routing.
 * Persist full resolve sessions in the database when the product flow is ready.
 */
export async function submitResolveProblem(problemText: string): Promise<SubmitResolveResult> {
  try {
    await requireRole(["student", "admin"]);
    const t = sanitizeString(problemText ?? "");
    if (t.length < 8) {
      return {
        error: true,
        message: "Please add a bit more detail (at least a sentence) so we can help.",
      };
    }
    return { problemId: randomUUID() };
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Could not start resolve.",
    };
  }
}
