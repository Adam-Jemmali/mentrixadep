"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  SendHorizontal,
  X,
} from "lucide-react";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { Button } from "@/shared/ui/button";
import { renderDiscussionBodyHtml } from "@/features/divisions/discussion-content-pure";
import type {
  DivisionForumThreadDetail,
  DivisionForumThreadSummary,
} from "@/features/divisions/division-forum";
import {
  getDivisionForumThread,
  postDivisionForumReply,
  postDivisionForumThread,
  uploadDivisionForumScreenshot,
} from "@/features/divisions/division-forum";

function ForumAvatar({
  displayName,
  avatarUrl,
  size = "md",
}: {
  displayName: string;
  avatarUrl: string | null;
  size?: "sm" | "md";
}) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "M";
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  if (avatarUrl) {
    return (
      <div className={cn("relative shrink-0 overflow-hidden rounded-full border border-slate-200", dim)}>
        <Image src={avatarUrl} alt="" fill unoptimized className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-indigo-50 font-bold text-indigo-700",
        dim,
      )}
    >
      {initial}
    </div>
  );
}

function ForumBody({ body }: { body: string }) {
  if (body === "(screenshot)") return null;
  return (
    <div
      className={cn(
        mentrixHubSurfaces.inkBody,
        "text-sm leading-relaxed whitespace-pre-wrap break-words [&_a]:text-[#4F46E5] [&_a]:underline [&_a]:underline-offset-2",
      )}
      dangerouslySetInnerHTML={{ __html: renderDiscussionBodyHtml(body) }}
    />
  );
}

function ForumScreenshot({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl border border-[#C4B5FD] bg-[#F8FAFC]">
      <Image
        src={url}
        alt={alt}
        width={960}
        height={540}
        unoptimized
        className="max-h-80 w-full object-contain"
      />
    </div>
  );
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ScreenshotPicker({
  disabled,
  previewUrl,
  onClear,
  onPick,
  uploading,
}: {
  disabled?: boolean;
  previewUrl: string | null;
  uploading: boolean;
  onClear: () => void;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="gap-1.5"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
        Screenshot
      </Button>
      {previewUrl ? (
        <div className="relative h-10 w-14 overflow-hidden rounded-md border border-slate-200">
          <Image src={previewUrl} alt="" fill unoptimized className="object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white"
            aria-label="Remove screenshot"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ThreadCard({
  thread,
  onOpen,
}: {
  thread: DivisionForumThreadSummary;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(thread.id)}
      className="w-full rounded-2xl border border-[#C4B5FD] bg-white/85 p-4 text-left transition hover:border-[#6366F1] hover:bg-[#EDE9FE]/55"
    >
      <div className="flex gap-3">
        <ForumAvatar displayName={thread.displayName} avatarUrl={thread.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[#0B1220]">{thread.title}</p>
            {thread.imageUrl ? (
              <span className="rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#4F46E5]">
                Image
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-[#475569]">
            {thread.body === "(screenshot)" ? "Screenshot attached" : thread.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
            <span>{thread.displayName}</span>
            <span>{formatWhen(thread.createdAt)}</span>
            <span className="inline-flex items-center gap-1 text-[#4F46E5]">
              <MentrixaVocabIcon name="league" size={12} surface="light" title="Replies" />
              {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function LeagueForumPanel({
  divisionKey,
  initialThreads,
  isMember,
}: {
  divisionKey: string;
  initialThreads: DivisionForumThreadSummary[];
  isMember: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [banner, setBanner] = useState<string | null>(null);
  const [threads, setThreads] = useState(initialThreads);
  const [activeThread, setActiveThread] = useState<DivisionForumThreadDetail | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  useEffect(() => {
    setThreads(initialThreads);
  }, [initialThreads]);

  const [showNewThread, setShowNewThread] = useState(false);
  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [threadImagePath, setThreadImagePath] = useState<string | null>(null);
  const [threadPreviewUrl, setThreadPreviewUrl] = useState<string | null>(null);
  const [threadUploading, setThreadUploading] = useState(false);

  const [replyBody, setReplyBody] = useState("");
  const [replyImagePath, setReplyImagePath] = useState<string | null>(null);
  const [replyPreviewUrl, setReplyPreviewUrl] = useState<string | null>(null);
  const [replyUploading, setReplyUploading] = useState(false);

  const openThread = useCallback(
    (threadId: string) => {
      setBanner(null);
      setLoadingThread(true);
      startTransition(async () => {
        const detail = await getDivisionForumThread(divisionKey, threadId);
        setActiveThread(detail);
        setLoadingThread(false);
        if (!detail) setBanner("Thread could not be loaded.");
      });
    },
    [divisionKey],
  );

  const uploadScreenshot = async (
    file: File,
    mode: "thread" | "reply",
  ) => {
    setBanner(null);
    const setUploading = mode === "thread" ? setThreadUploading : setReplyUploading;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const result = await uploadDivisionForumScreenshot(divisionKey, form);
      if (!result.success) {
        setBanner(result.error);
        return;
      }
      if (mode === "thread") {
        setThreadImagePath(result.path);
        setThreadPreviewUrl(result.previewUrl);
      } else {
        setReplyImagePath(result.path);
        setReplyPreviewUrl(result.previewUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  const submitThread = (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    startTransition(async () => {
      const r = await postDivisionForumThread(
        divisionKey,
        threadTitle,
        threadBody,
        threadImagePath,
      );
      if (!r.success) {
        setBanner(r.error);
        return;
      }
      setThreadTitle("");
      setThreadBody("");
      setThreadImagePath(null);
      setThreadPreviewUrl(null);
      setShowNewThread(false);
      router.refresh();
      await openThread(r.threadId);
    });
  };

  const submitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread) return;
    setBanner(null);
    startTransition(async () => {
      const r = await postDivisionForumReply(
        divisionKey,
        activeThread.id,
        replyBody,
        replyImagePath,
      );
      if (!r.success) {
        setBanner(r.error);
        return;
      }
      setReplyBody("");
      setReplyImagePath(null);
      setReplyPreviewUrl(null);
      router.refresh();
      await openThread(activeThread.id);
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-2">
            <MentrixaVocabIcon name="league" size={16} surface="light" title="League forum" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#0B1220]">League forum</h2>
          </div>
          <p className={cn("mt-1 text-xs font-medium", mentrixHubSurfaces.inkMuted)}>
            Start threads, reply to teammates, and share study screenshots. Links must use https and pass safety review.
          </p>
        </div>
        {isMember && !activeThread ? (
          <Button type="button" onClick={() => setShowNewThread((v) => !v)}>
            {showNewThread ? "Cancel" : "New thread"}
          </Button>
        ) : null}
      </div>

      {banner ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {banner}
        </div>
      ) : null}

      {showNewThread && isMember ? (
        <form onSubmit={submitThread} className={cn(mentrixStudent.card, "space-y-4 p-5")}>
          <div>
            <label className={mentrixHubSurfaces.inkLabel}>Thread title</label>
            <input
              value={threadTitle}
              onChange={(e) => setThreadTitle(e.target.value)}
              maxLength={120}
              required
              placeholder="What do you want to discuss?"
              className={cn("mt-2", mentrixHubSurfaces.fieldInput)}
            />
          </div>
          <div>
            <label className={mentrixHubSurfaces.inkLabel}>Message</label>
            <textarea
              value={threadBody}
              onChange={(e) => setThreadBody(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Share strategy, ask for help, or post a verified practice note. Up to 3 https links."
              className={cn("mt-2", mentrixHubSurfaces.fieldInput, "min-h-[6rem] resize-y")}
            />
          </div>
          <ScreenshotPicker
            disabled={isPending}
            previewUrl={threadPreviewUrl}
            uploading={threadUploading}
            onClear={() => {
              setThreadImagePath(null);
              setThreadPreviewUrl(null);
            }}
            onPick={(file) => void uploadScreenshot(file, "thread")}
          />
          <Button type="submit" disabled={isPending || threadUploading} className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            Post thread
          </Button>
        </form>
      ) : null}

      {activeThread ? (
        <div className={cn(mentrixStudent.card, "overflow-hidden")}>
          <div className="border-b border-[#C4B5FD] px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn("gap-1.5 text-[#4F46E5] hover:bg-[#EDE9FE]", mentrixStudent.hubGhostLink)}
              onClick={() => {
                setActiveThread(null);
                setReplyBody("");
                setReplyImagePath(null);
                setReplyPreviewUrl(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              All threads
            </Button>
          </div>

          {loadingThread ? (
            <div className={cn("flex items-center justify-center gap-2 p-12 text-sm", mentrixHubSurfaces.inkMuted)}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading thread…
            </div>
          ) : (
            <>
              <article className="border-b border-[#C4B5FD] p-5 sm:p-6">
                <div className="flex gap-3">
                  <ForumAvatar displayName={activeThread.displayName} avatarUrl={activeThread.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black tracking-tight text-[#0B1220]">{activeThread.title}</h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
                      {activeThread.displayName} · {formatWhen(activeThread.createdAt)}
                    </p>
                    <div className="mt-4">
                      <ForumBody body={activeThread.body} />
                      {activeThread.imageUrl ? (
                        <ForumScreenshot url={activeThread.imageUrl} alt="Thread screenshot" />
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>

              <div className="divide-y divide-[#E0E7FF]">
                {activeThread.replies.length === 0 ? (
                  <p className={cn("p-6 text-center text-sm", mentrixHubSurfaces.inkMuted)}>No replies yet. Be the first.</p>
                ) : (
                  activeThread.replies.map((reply) => (
                    <article key={reply.id} className="p-5 sm:px-6">
                      <div className="flex gap-3">
                        <ForumAvatar displayName={reply.displayName} avatarUrl={reply.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
                            {reply.displayName} · {formatWhen(reply.createdAt)}
                          </p>
                          <div className="mt-2">
                            <ForumBody body={reply.body} />
                            {reply.imageUrl ? (
                              <ForumScreenshot url={reply.imageUrl} alt="Reply screenshot" />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {isMember ? (
                <form onSubmit={submitReply} className="space-y-3 border-t border-[#C4B5FD] bg-[#EDE9FE]/35 p-4 sm:p-5">
                  <label className={mentrixHubSurfaces.inkLabel}>Reply</label>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Reply with text, https links, or a screenshot."
                    className={cn(mentrixHubSurfaces.fieldInput, "min-h-[5rem] resize-y")}
                  />
                  <ScreenshotPicker
                    disabled={isPending}
                    previewUrl={replyPreviewUrl}
                    uploading={replyUploading}
                    onClear={() => {
                      setReplyImagePath(null);
                      setReplyPreviewUrl(null);
                    }}
                    onPick={(file) => void uploadScreenshot(file, "reply")}
                  />
                  <Button type="submit" disabled={isPending || replyUploading} size="sm" className="gap-2">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                    Post reply
                  </Button>
                </form>
              ) : (
                <p className="border-t border-[#C4B5FD] p-4 text-center text-xs font-bold uppercase tracking-widest text-[#64748B]">
                  Join the league to reply
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {threads.length === 0 ? (
            <div className={cn(mentrixStudent.card, "p-10 text-center")}>
              <MentrixaVocabIcon name="league" size={40} surface="light" className="mx-auto opacity-40" title="League forum" />
              <p className={cn("mt-3 text-sm font-medium", mentrixHubSurfaces.inkBody)}>No threads yet.</p>
              <p className={cn("mt-1 text-xs", mentrixHubSurfaces.inkMuted)}>Start the first league conversation.</p>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} onOpen={openThread} />
            ))
          )}
        </div>
      )}
    </section>
  );
}
