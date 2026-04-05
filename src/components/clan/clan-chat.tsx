"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { trackClientEvent } from "@/lib/use-track";
import { postClanMessage, type ClanMessageRow } from "@/app/actions/clan-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RealtimeSubscribeStatus } from "@supabase/supabase-js";

type Props = {
  clanId: string;
  initialMessages: ClanMessageRow[];
  currentUserId: string;
};

export function ClanChat({ clanId, initialMessages, currentUserId }: Props) {
  const [items, setItems] = useState<ClanMessageRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`clan-chat-${clanId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "clan_messages",
          filter: `clan_id=eq.${clanId}`,
        },
        (payload) => {
          const n = payload.new as {
            id?: string;
            user_id?: string;
            body?: string;
            created_at?: string;
          };
          if (!n.id || !n.user_id || !n.body || !n.created_at) return;
          const row: ClanMessageRow = {
            id: n.id,
            user_id: n.user_id,
            body: n.body,
            created_at: n.created_at,
            display_name: null,
          };
          setItems((prev) => {
            if (prev.some((p) => p.id === row.id)) return prev;
            return [...prev, row].slice(-120);
          });
        }
      )
      .subscribe((status: RealtimeSubscribeStatus) => {
        if (status === "SUBSCRIBED") {
          trackClientEvent("realtime_reconnect", {
            channel: `clan-chat-${clanId}`,
            reason: "subscribed",
          });
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          trackClientEvent("realtime_disconnect", {
            channel: `clan-chat-${clanId}`,
            reason: status.toLowerCase(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clanId]);

  async function send() {
    const t = text.trim();
    if (t.length < 1 || sending) return;
    setSending(true);
    setError(null);
    const res = await postClanMessage(clanId, t);
    setSending(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setText("");
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-900">Clan chat</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time — only your clan sees this thread.
        </p>
      </div>
      <div className="flex max-h-[min(420px,50vh)] flex-col">
        <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <AnimatePresence initial={false}>
            {items.map((m) => {
              const mine = m.user_id === currentUserId;
              const label =
                m.display_name?.trim() ||
                `Learner ${m.user_id.slice(0, 6)}`;
              const time = new Date(m.created_at).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-md px-3 py-2 text-sm ${
                      mine
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    {!mine && (
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">
                        {label}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {time}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
        {error && (
          <p className="px-4 text-xs text-red-600">{error}</p>
        )}
        <form
          className="flex gap-2 border-t border-slate-100 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message…"
            maxLength={2000}
            className="text-sm"
            disabled={sending}
          />
          <Button type="submit" size="sm" disabled={sending || !text.trim()}>
            {sending ? "…" : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
}
