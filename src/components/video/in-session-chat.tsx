"use client";

/**
 * InSessionChat — real-time text chat during a video session.
 * Messages broadcast via Supabase Realtime channel (no DB persistence).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Send } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  authorId: string;
  authorLabel: string;
  text: string;
  sentAt: number;
  isSelf: boolean;
}

interface ChatPayload {
  id: string;
  authorId: string;
  authorLabel: string;
  text: string;
  sentAt: number;
}

interface InSessionChatProps {
  channel: RealtimeChannel | null;
  userId: string;
  userLabel: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InSessionChat({ channel, userId, userLabel }: InSessionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to incoming messages
  useEffect(() => {
    if (!channel) return;
    const sub = channel.on(
      "broadcast",
      { event: "chat" },
      ({ payload }: { payload: ChatPayload }) => {
        if (payload.authorId === userId) return; // already added locally
        const msg: ChatMessage = {
          id: payload.id,
          authorId: payload.authorId,
          authorLabel: payload.authorLabel,
          text: payload.text,
          sentAt: payload.sentAt,
          isSelf: false,
        };
        setMessages((prev) => [...prev, msg]);
      }
    );
    return () => {
      void sub.unsubscribe();
    };
  }, [channel, userId]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text || !channel) return;

    const payload: ChatPayload = {
      id: `${userId}-${Date.now()}`,
      authorId: userId,
      authorLabel: userLabel,
      text,
      sentAt: Date.now(),
    };

    void channel.send({ type: "broadcast", event: "chat", payload });

    setMessages((prev) => [
      ...prev,
      { ...payload, isSelf: true },
    ]);
    setDraft("");
    inputRef.current?.focus();
  }, [draft, channel, userId, userLabel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <div className="flex flex-col h-full bg-[#0d0e11] border-l border-white/8">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/8">
        <p className="text-xs font-medium text-white/50">Session chat</p>
        <p className="text-[10px] text-white/25 mt-0.5">
          Messages visible to both participants
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
      >
        {messages.length === 0 && (
          <p className="text-[11px] text-white/20 text-center mt-4">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                msg.isSelf
                  ? "bg-white/10 text-white"
                  : "bg-white/5 text-white/80"
              }`}
            >
              {!msg.isSelf && (
                <p className="text-[9px] font-medium text-white/40 mb-0.5 uppercase tracking-wide">
                  {msg.authorLabel}
                </p>
              )}
              <p className="text-xs leading-relaxed break-words">{msg.text}</p>
            </div>
            <p className="text-[9px] text-white/20 mt-0.5 px-1">
              {formatTime(msg.sentAt)}
            </p>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-white/8 flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          maxLength={500}
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!draft.trim()}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150 ${
            draft.trim()
              ? "bg-white/15 text-white hover:bg-white/20"
              : "bg-transparent text-white/20 cursor-not-allowed"
          }`}
          aria-label="Send message"
        >
          <Send size={13} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
