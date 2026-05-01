"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Info, Users } from "lucide-react";
import type { DivisionHubCard } from "@/app/actions/divisions";
import { joinDivision } from "@/app/actions/divisions";
import { getDivisionTheme } from "@/lib/division-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DivisionHubClient({ initialCards }: { initialCards: DivisionHubCard[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleJoin = (key: string) => {
    setError(null);
    startTransition(async () => {
      const r = await joinDivision(key);
      if (!r.success) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-slate-900/10 border border-slate-900/20 flex items-center gap-3 text-slate-900 text-xs font-bold uppercase tracking-widest"
        >
          <Info className="w-4 h-4" />
          {error}
        </motion.div>
      )}
      
      <motion.ul 
        layout
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {initialCards.map((c, i) => {
          const t = getDivisionTheme(c.key);
          const focused = c.isFocused;
          return (
            <motion.li 
              key={c.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className={cn(
                  "group relative h-full flex flex-col rounded-3xl border bg-white p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1",
                  focused
                    ? "border-indigo-500 ring-2 ring-indigo-300/60"
                    : "border-slate-200 hover:border-indigo-300"
                )}
              >
                {/* ICON & TITLE */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn("relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110", t.gradient)}>
                      {t.emoji}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black italic uppercase tracking-tighter text-slate-900 leading-none truncate">
                        {c.name.replace(/\s+Division$/i, "")}
                      </h2>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           <Users className="w-3 h-3 opacity-50" />
                           {c.memberCount.toLocaleString()}
                        </div>
                        {c.weeklyRank != null && (
                          <div className="flex items-center gap-1 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                             <span>| Rank #{c.weeklyRank}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <p className="mt-4 text-xs font-medium leading-relaxed text-slate-500 flex-1 line-clamp-2">
                  {c.description || "Compete in this division and climb the global leaderboards."}
                </p>

                {/* FOOTER ACTIONS */}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-10 rounded-xl border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95" 
                    asChild
                  >
                    <Link href={`/student/division/${encodeURIComponent(c.key)}`}>
                      Enter Arena
                    </Link>
                  </Button>
                  
                  {!c.isMember ? (
                    <Button
                      disabled={isPending}
                      onClick={() => handleJoin(c.key)}
                      className="flex-1 h-10 rounded-xl bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95"
                    >
                      Join
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                       <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Joined</span>
                    </div>
                  )}
                </div>

                {/* DECORATIVE LOGO */}
                <div className="absolute -bottom-2 -right-2 p-2 opacity-[0.02] grayscale pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                   <Image src="/mentrixalogo/logo.png" alt="" width={80} height={80} />
                </div>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
