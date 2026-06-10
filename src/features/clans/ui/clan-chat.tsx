"use client";

import { postClanMessage } from "@/features/clans/clan-messages";
import type { ClanMessageRow } from "@/features/clans/clan-messages";
import type { ClanDashboardPayload } from "@/features/clans/clan-reads";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { createClient } from "@/shared/integrations/supabase/client";
import { trackClientEvent } from "@/shared/integrations/use-track";

import { Input } from "@/shared/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/shared/core/utils";

type RealtimeSubscribeStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

type ClanMessageInsertPayload = {
  new: {
    id?: string;
    user_id?: string;
    body?: string;
    created_at?: string;
  };
};

type Props = {
  clanId: string;
  initialMessages: ClanMessageRow[];
  currentUserId: string;
  members: ClanDashboardPayload["members"];
};

function formatChatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export function ClanChat({ clanId, initialMessages, currentUserId, members }: Props) {
  const [items, setItems] = useState<ClanMessageRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const memberMap = useMemo(() => {
    const m = new Map<string, typeof members[0]>();
    for (const mem of members) m.set(mem.user_id, mem);
    return m;
  }, [members]);

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
        (payload: ClanMessageInsertPayload) => {
          const n = payload.new as {
            id?: string;
            user_id?: string;
            body?: string;
            created_at?: string;
          };
          if (!n.id || !n.user_id || !n.body || !n.created_at) return;
          
          const mem = memberMap.get(n.user_id);
          const row: ClanMessageRow = {
            id: n.id,
            user_id: n.user_id,
            body: n.body,
            created_at: n.created_at,
            display_name: mem?.display_name ?? null,
            avatar_url: mem?.avatar_url ?? null,
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
  }, [clanId, memberMap]);

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
    <div className="flex flex-col h-full bg-white">
      <div className="pb-6 border-b border-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">
          Clan Chat
        </h3>
        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Live Thread</span>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto no-scrollbar py-6 space-y-8">
          <AnimatePresence initial={false}>
            {items.map((m) => {
              const mine = m.user_id === currentUserId;
              const label = m.display_name?.trim() || `Mentrixer ${m.user_id.slice(0, 6)}`;
              const time = formatChatTime(m.created_at);
              
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    mine ? "flex-row-reverse items-start text-right" : "flex-row items-start text-left"
                  )}
                >
                  <div className="relative h-8 w-8 shrink-0 mt-1">
                    {m.avatar_url ? (
                      <Image src={m.avatar_url} alt="" fill unoptimized className="object-cover rounded-full" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-50 rounded-full text-[10px] font-bold text-slate-300">
                        {label[0]}
                      </div>
                    )}
                  </div>

                  <div className={cn("flex flex-col gap-1.5 max-w-[80%]", mine ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                         {label}
                       </span>
                       <span className="text-[8px] font-bold text-slate-200 uppercase tracking-widest">
                         {time}
                       </span>
                    </div>
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed break-words whitespace-pre-wrap transition-all",
                      mine 
                        ? "bg-slate-900 text-white rounded-tr-none shadow-lg shadow-slate-900/10" 
                        : "bg-slate-50 text-slate-600 rounded-tl-none"
                    )}>
                      {m.body}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="py-2 text-[9px] font-bold text-red-400 uppercase tracking-wider">{error}</p>
        )}

        <form
          className="pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="relative group">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message..."
              maxLength={2000}
              className="bg-slate-50 border-none h-12 rounded-xl text-slate-900 pl-4 pr-12 transition-all placeholder:text-slate-300 text-xs font-bold"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="absolute right-2 top-1.5 p-2 text-slate-200 hover:text-slate-900 transition-all"
            >
               <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



