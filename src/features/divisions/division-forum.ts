"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  assertNoBlockedLanguage,
  enforceSlidingRateLimit,
  getRateLimitId,
  RATE_LIMITS,
  sanitizeInput,
  validateUploadedFile,
} from "@/shared/core/security";
import {
  DISCUSSION_REPLY_BODY_MAX,
  DISCUSSION_THREAD_BODY_MAX,
  DISCUSSION_THREAD_TITLE_MAX,
  validateDiscussionLinks,
} from "@/features/divisions/discussion-content-pure";
import { assertAllowedArenaDivisionKey } from "@/features/divisions/ap-calc-ab-division";
import { resolveDisplayNames, resolveAvatarUrls } from "@/features/divisions/division-forum-reads";
import { processDiscussionScreenshot } from "@/features/divisions/discussion-image-moderation";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;

function requireArenaDivisionKey(divisionKey: string): string {
  const allowed = assertAllowedArenaDivisionKey(divisionKey.trim());
  if (!allowed.ok) throw new Error(allowed.error);
  return allowed.key;
}

export type DivisionForumReply = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
};

export type DivisionForumThreadSummary = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  replyCount: number;
  lastReplyAt: string | null;
};

export type DivisionForumThreadDetail = DivisionForumThreadSummary & {
  replies: DivisionForumReply[];
};

async function assertDivisionMember(userId: string, divisionKey: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_divisions")
    .select("division_key")
    .eq("user_id", userId)
    .eq("division_key", divisionKey)
    .maybeSingle();
  if (!data) {
    throw new Error("Join this league to participate in discussion.");
  }
}

async function signedDiscussionImageUrl(
  admin: ReturnType<typeof createAdminClient>,
  path: string | null,
  status: string,
): Promise<string | null> {
  if (!path || status !== "approved") return null;
  const { data, error } = await admin.storage
    .from("division-discussion")
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function sanitizeForumText(text: string, maxLen: number): string {
  const value = sanitizeInput(text, "forum post").slice(0, maxLen);
  assertNoBlockedLanguage(value, "forum post");
  const links = validateDiscussionLinks(value);
  if (!links.ok) throw new Error(links.reason);
  return value;
}

export async function getDivisionForumThreads(
  divisionKey: string,
  limit = 40,
): Promise<DivisionForumThreadSummary[]> {
  await requireRole(["student", "admin"]);
  const key = requireArenaDivisionKey(divisionKey);
  const admin = createAdminClient();

  const { data: roots } = await admin
    .from("division_messages")
    .select("id, user_id, title, body, image_path, image_status, created_at")
    .eq("division_key", key)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!roots?.length) return [];

  const rootIds = roots.map((r) => r.id);
  const { data: replyRows } = await admin
    .from("division_messages")
    .select("thread_id, created_at")
    .in("thread_id", rootIds)
    .not("parent_id", "is", null);

  const replyCountByThread = new Map<string, number>();
  const lastReplyByThread = new Map<string, string>();
  for (const row of replyRows ?? []) {
    const tid = row.thread_id as string;
    replyCountByThread.set(tid, (replyCountByThread.get(tid) ?? 0) + 1);
    const prev = lastReplyByThread.get(tid);
    if (!prev || row.created_at > prev) lastReplyByThread.set(tid, row.created_at);
  }

  const userIds = roots.map((r) => r.user_id);
  const [names, avatars] = await Promise.all([
    resolveDisplayNames(admin, userIds),
    resolveAvatarUrls(admin, userIds),
  ]);

  return Promise.all(
    roots.map(async (r) => ({
      id: r.id,
      userId: r.user_id,
      displayName: names[r.user_id] ?? "Member",
      avatarUrl: avatars[r.user_id] ?? null,
      title: r.title ?? r.body.slice(0, 120),
      body: r.body,
      imageUrl: await signedDiscussionImageUrl(admin, r.image_path, r.image_status),
      createdAt: r.created_at,
      replyCount: replyCountByThread.get(r.id) ?? 0,
      lastReplyAt: lastReplyByThread.get(r.id) ?? null,
    })),
  );
}

export async function getDivisionForumThread(
  divisionKey: string,
  threadId: string,
): Promise<DivisionForumThreadDetail | null> {
  await requireRole(["student", "admin"]);
  const key = requireArenaDivisionKey(divisionKey);
  const admin = createAdminClient();

  const { data: root } = await admin
    .from("division_messages")
    .select("id, user_id, division_key, title, body, image_path, image_status, created_at")
    .eq("id", threadId)
    .is("parent_id", null)
    .maybeSingle();

  if (!root || root.division_key !== key) return null;

  const { data: replies } = await admin
    .from("division_messages")
    .select("id, user_id, body, image_path, image_status, created_at")
    .eq("thread_id", threadId)
    .not("parent_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(200);

  const userIds = [root.user_id, ...(replies ?? []).map((r) => r.user_id)];
  const [names, avatars] = await Promise.all([
    resolveDisplayNames(admin, userIds),
    resolveAvatarUrls(admin, userIds),
  ]);

  const replyCount = replies?.length ?? 0;
  const lastReplyAt = replies?.length ? replies[replies.length - 1]?.created_at ?? null : null;

  const mappedReplies: DivisionForumReply[] = await Promise.all(
    (replies ?? []).map(async (r) => ({
      id: r.id,
      userId: r.user_id,
      displayName: names[r.user_id] ?? "Member",
      avatarUrl: avatars[r.user_id] ?? null,
      body: r.body,
      imageUrl: await signedDiscussionImageUrl(admin, r.image_path, r.image_status),
      createdAt: r.created_at,
    })),
  );

  return {
    id: root.id,
    userId: root.user_id,
    displayName: names[root.user_id] ?? "Member",
    avatarUrl: avatars[root.user_id] ?? null,
    title: root.title ?? root.body.slice(0, 120),
    body: root.body,
    imageUrl: await signedDiscussionImageUrl(admin, root.image_path, root.image_status),
    createdAt: root.created_at,
    replyCount,
    lastReplyAt,
    replies: mappedReplies,
  };
}

export async function postDivisionForumThread(
  divisionKey: string,
  title: string,
  body: string,
  imagePath?: string | null,
): Promise<{ success: true; threadId: string } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const key = requireArenaDivisionKey(divisionKey);
    await enforceSlidingRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.divisionForumPost,
      "league forum post",
    );
    await assertDivisionMember(user.id, key);

    const safeTitle = sanitizeInput(title, "thread title").slice(0, DISCUSSION_THREAD_TITLE_MAX);
    if (safeTitle.length < 1) {
      return { success: false, error: "Thread title is required." };
    }
    assertNoBlockedLanguage(safeTitle, "thread title");

    const safeBody = body.trim()
      ? sanitizeForumText(body, DISCUSSION_THREAD_BODY_MAX)
      : "";

    if (!safeBody && !imagePath) {
      return { success: false, error: "Add a message or screenshot to start a thread." };
    }

    const admin = createAdminClient();
    let storedImagePath: string | null = null;
    let imageStatus = "none";

    if (imagePath) {
      const expectedPrefix = `${key}/${user.id}/`;
      if (!imagePath.startsWith(expectedPrefix)) {
        return { success: false, error: "Invalid screenshot reference." };
      }
      const { data: listed } = await admin.storage.from("division-discussion").list(`${key}/${user.id}`, {
        search: imagePath.split("/").pop(),
      });
      if (!listed?.length) {
        return { success: false, error: "Screenshot upload expired. Upload again." };
      }
      storedImagePath = imagePath;
      imageStatus = "approved";
    }

    const { data: inserted, error } = await admin
      .from("division_messages")
      .insert({
        division_key: key,
        user_id: user.id,
        parent_id: null,
        thread_id: null,
        title: safeTitle,
        body: safeBody || "(screenshot)",
        image_path: storedImagePath,
        image_status: imageStatus,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { success: false, error: error?.message ?? "Could not create thread." };
    }

    await admin
      .from("division_messages")
      .update({ thread_id: inserted.id })
      .eq("id", inserted.id);

    revalidatePath(`/student/division/${key}`);
    return { success: true, threadId: inserted.id };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not create thread.",
    };
  }
}

export async function postDivisionForumReply(
  divisionKey: string,
  threadId: string,
  body: string,
  imagePath?: string | null,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const key = requireArenaDivisionKey(divisionKey);
    await enforceSlidingRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.divisionForumPost,
      "league forum reply",
    );
    await assertDivisionMember(user.id, key);

    const safeBody = body.trim()
      ? sanitizeForumText(body, DISCUSSION_REPLY_BODY_MAX)
      : "";

    if (!safeBody && !imagePath) {
      return { success: false, error: "Reply cannot be empty." };
    }

    const admin = createAdminClient();
    const { data: root } = await admin
      .from("division_messages")
      .select("id, division_key")
      .eq("id", threadId)
      .is("parent_id", null)
      .maybeSingle();

    if (!root || root.division_key !== key) {
      return { success: false, error: "Thread not found." };
    }

    let storedImagePath: string | null = null;
    let imageStatus = "none";
    if (imagePath) {
      const expectedPrefix = `${key}/${user.id}/`;
      if (!imagePath.startsWith(expectedPrefix)) {
        return { success: false, error: "Invalid screenshot reference." };
      }
      storedImagePath = imagePath;
      imageStatus = "approved";
    }

    const { error } = await admin.from("division_messages").insert({
      division_key: key,
      user_id: user.id,
      parent_id: threadId,
      thread_id: threadId,
      title: null,
      body: safeBody || "(screenshot)",
      image_path: storedImagePath,
      image_status: imageStatus,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/student/division/${key}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not post reply.",
    };
  }
}

export async function uploadDivisionForumScreenshot(
  divisionKey: string,
  formData: FormData,
): Promise<
  | { success: true; path: string; previewUrl: string | null }
  | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    const key = requireArenaDivisionKey(divisionKey);
    await enforceSlidingRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.divisionForumImage,
      "league forum screenshot",
    );
    await assertDivisionMember(user.id, key);

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "Choose a screenshot to upload." };
    }

    const validated = await validateUploadedFile(file, {
      allowedMimeTypes: ALLOWED_IMAGE_TYPES,
      maxBytes: 5 * 1024 * 1024,
    });
    if (!validated.ok) return { success: false, error: validated.error };

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const processed = await processDiscussionScreenshot(inputBuffer);
    if (!processed.ok) return { success: false, error: processed.error };

    const ext = processed.contentType === "image/png" ? "png" : "jpg";
    const objectPath = `${key}/${user.id}/${crypto.randomUUID()}.${ext}`;

    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from("division-discussion")
      .upload(objectPath, processed.buffer, {
        contentType: processed.contentType,
        upsert: false,
      });

    if (uploadError) return { success: false, error: "Upload failed." };

    const { data: signed } = await admin.storage
      .from("division-discussion")
      .createSignedUrl(objectPath, 60 * 60);

    return {
      success: true,
      path: objectPath,
      previewUrl: signed?.signedUrl ?? null,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Upload failed.",
    };
  }
}

/** @deprecated Use postDivisionForumThread or postDivisionForumReply */
export async function postDivisionMessage(
  divisionKey: string,
  body: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const title = body.trim().slice(0, DISCUSSION_THREAD_TITLE_MAX) || "League note";
  const r = await postDivisionForumThread(divisionKey, title, body);
  if (!r.success) return r;
  return { success: true };
}
