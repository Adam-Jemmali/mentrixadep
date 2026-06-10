"use server";

import { randomUUID } from "crypto";
import { requireRole } from "@/shared/core/auth";
import {
  sanitizeInput,
  validateUploadedFile,
  enforceSlidingRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/shared/core/security";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { solveResolveProblemWithGemini, type ResolveAiOutput } from "@/shared/integrations/ai/resolve-runner";
import { applyXpAward } from "@/features/xp/xp-awards";
import { resolveIntakeSchema } from "@/shared/core/schemas";
import { toUserFacingAiError, toUserFacingApiError } from "@/shared/core/user-facing-error";

type ResolveDifficulty = "no_idea" | "concept_but_stuck" | "minor_confusion";

export type SubmitResolveResult =
  | { problemId: string }
  | { error: true; message: string };

export type ResolveProblemRow = {
  id: string;
  user_id: string;
  subject: string;
  problem_text: string;
  image_url: string | null;
  difficulty: ResolveDifficulty;
  ai_response: ResolveAiOutput | null;
  was_helpful: boolean | null;
  tutor_escalated: boolean;
  created_at: string;
};

function safeExt(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

function toBool(v: FormDataEntryValue | null): boolean {
  if (typeof v !== "string") return false;
  return v === "true" || v === "1" || v === "on";
}

export async function submitResolveProblem(formData: FormData): Promise<SubmitResolveResult> {
  try {
    const user = await requireRole(["student", "admin"]);
    await enforceSlidingRateLimit(getRateLimitId(user.id), RATE_LIMITS.resolveAi, "resolve.ai");

    const parsed = resolveIntakeSchema.safeParse({
      subject: formData.get("subject"),
      problemText: formData.get("problemText"),
      difficulty: formData.get("difficulty"),
      bookTutorIfAiFails: toBool(formData.get("bookTutorIfAiFails")),
    });

    if (!parsed.success) {
      return { error: true, message: "Please complete all required fields." };
    }

    const { subject, problemText, difficulty, bookTutorIfAiFails } = parsed.data;
    const admin = createAdminClient();
    const problemId = randomUUID();

    let imageUrl: string | null = null;
    let imageBase64: string | null = null;
    let imageMimeType: string | null = null;

    const maybeImage = formData.get("image");
    const imageFile = maybeImage instanceof File ? maybeImage : null;
    if (imageFile && imageFile.size > 0) {
      const validUpload = await validateUploadedFile(imageFile, {
        allowedMimeTypes: ["image/jpeg", "image/png"],
        maxBytes: 10 * 1024 * 1024,
      });
      if (!validUpload.ok) {
        return { error: true, message: validUpload.error };
      }

      const bytes = Buffer.from(await imageFile.arrayBuffer());
      imageBase64 = bytes.toString("base64");
      imageMimeType = validUpload.mimeType || "image/jpeg";

      const path = `${user.id}/${problemId}-${Date.now()}.${safeExt(imageMimeType)}`;
      const { error: upErr } = await admin.storage
        .from("resolve-images")
        .upload(path, bytes, {
          contentType: imageMimeType,
          cacheControl: "3600",
          upsert: false,
        });
      if (upErr) {
        return { error: true, message: `Image upload failed: ${upErr.message}` };
      }
      const { data: pub } = admin.storage.from("resolve-images").getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }

    const cleanSubject = sanitizeInput(subject, "subject").slice(0, 120);
    const cleanProblem = sanitizeInput(problemText, "problemText").slice(0, 8000);

    const { error: insertErr } = await admin.from("resolve_problems").insert({
      id: problemId,
      user_id: user.id,
      subject: cleanSubject,
      problem_text: cleanProblem,
      image_url: imageUrl,
      difficulty,
      ai_response: null,
      tutor_escalated: false,
    });
    if (insertErr) {
      return { error: true, message: `Could not save problem: ${insertErr.message}` };
    }

    let aiResponse: ResolveAiOutput;
    try {
      aiResponse = await solveResolveProblemWithGemini({
        subject: cleanSubject,
        difficulty,
        problemText: cleanProblem,
        imageBase64,
        imageMimeType,
      });
    } catch (e) {
      const msg = toUserFacingAiError(e);
      return { error: true, message: msg };
    }

    await admin
      .from("resolve_problems")
      .update({
        ai_response: {
          ...aiResponse,
          bookTutorIfAiFails,
          solvedAt: new Date().toISOString(),
          model: "gemini-2.5-flash",
        },
      })
      .eq("id", problemId)
      .eq("user_id", user.id);

    // Encourage adoption: +25 XP once per problem
    await applyXpAward(user.id, 25, `resolve_use:${problemId}`);

    return { problemId };
  } catch (e) {
    return {
      error: true,
      message: toUserFacingApiError(e),
    };
  }
}

export async function getResolveProblem(problemId: string): Promise<ResolveProblemRow | null> {
  try {
    const user = await requireRole(["student", "admin"]);
    const admin = createAdminClient();
    const { data } = await admin
      .from("resolve_problems")
      .select("*")
      .eq("id", problemId)
      .eq("user_id", user.id)
      .maybeSingle();
    return (data as ResolveProblemRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function setResolveHelpful(
  problemId: string,
  wasHelpful: boolean,
): Promise<{ success: true } | { error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const admin = createAdminClient();
    const { error } = await admin
      .from("resolve_problems")
      .update({ was_helpful: wasHelpful })
      .eq("id", problemId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return { error: toUserFacingApiError(e) };
  }
}

export async function escalateResolveToTutor(
  problemId: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const admin = createAdminClient();
    const { error } = await admin
      .from("resolve_problems")
      .update({ tutor_escalated: true })
      .eq("id", problemId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return { error: toUserFacingApiError(e) };
  }
}

export async function saveResolveToStudyNotes(
  problemId: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const admin = createAdminClient();

    const { data: row, error: rowErr } = await admin
      .from("resolve_problems")
      .select("*")
      .eq("id", problemId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (rowErr || !row) return { error: "Resolve problem not found." };

    const ai = (row.ai_response ?? {}) as ResolveAiOutput;
    const title = `Resolve: ${row.subject}`;
    const bodyParts: string[] = [
      `Subject: ${row.subject}`,
      "",
      "Problem",
      row.problem_text,
      "",
      "Summary",
      ai.summary ?? "No summary available",
      "",
      "Approach",
      ...(Array.isArray(ai.approach) ? ai.approach.map((s, i) => `${i + 1}. ${s}`) : []),
      "",
      "Step-by-step",
      ...(Array.isArray(ai.explanationSteps)
        ? ai.explanationSteps.map((s, i) => `${i + 1}. ${s}`)
        : []),
      "",
      "Checks",
      ...(Array.isArray(ai.checks) ? ai.checks.map((s) => `- ${s}`) : []),
      "",
      ai.finalAnswer ? `Final answer: ${ai.finalAnswer}` : "Final answer intentionally omitted.",
    ];
    const noteBody = bodyParts.join("\n").slice(0, 20000);

    const { error } = await admin.from("resolve_study_notes").upsert(
      {
        user_id: user.id,
        problem_id: row.id,
        subject: row.subject,
        note_title: title.slice(0, 200),
        note_body: noteBody,
      },
      { onConflict: "user_id,problem_id" },
    );
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return { error: toUserFacingApiError(e) };
  }
}
