import { getClanDashboard, getPublicClanSnapshot } from "@/features/clans/clan-reads";
import { listClanMessages } from "@/features/clans/clan-messages";
import { listPendingJoinRequests } from "@/features/clans/clan-join-requests";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getDivisionsCatalog } from "@/features/divisions/leaderboard";

import { Button } from "@/shared/ui/button";
import Image from "next/image";
import { clanArenaOutlineButton } from "@/features/clans/clan-light-form-ui";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { ClanDashboardClient } from "./clan-dashboard-client";
import { ClanPublicPreview } from "./clan-public-preview";

export const metadata = { title: "Clan · Mentrixa" };

interface Props {
  params: Promise<{ clanId: string }>;
}

type DivisionOption = { key: string; name: string };

export default async function ClanDetailPage({ params }: Props) {
  const { clanId } = await params;
  const user = await requireRole(["student", "admin"]);
  if (user.role !== "student") notFound();

  const admin = createAdminClient();
  const { data: mem } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", user.id)
    .eq("clan_id", clanId)
    .maybeSingle();

  const divisions = await getDivisionsCatalog();
  const divisionOptions: DivisionOption[] = divisions.map((d) => ({ key: d.key, name: d.name }));
  const resolveDivName = (key: string | null) =>
    key ? divisions.find((d) => d.key === key)?.name ?? key : "-";

  if (!mem?.clan_id) {
    const snap = await getPublicClanSnapshot(clanId);
    if (!snap) notFound();
  // Resolve label before server to client boundary
    const divisionLabel = resolveDivName(snap.focus_division_key ?? null);
    return (
      <div className={mentrixStudent.pageBg}>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" className={clanArenaOutlineButton} asChild>
              <Link href="/student/clan">← Clans</Link>
            </Button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Image
                src="/icons/mentrixer.svg"
                alt=""
                width={13}
                height={13}
                className="size-[13px] shrink-0"
                aria-hidden
              />
              Mentrixer
            </span>
          </div>
          <ClanPublicPreview snap={snap} divisionLabel={divisionLabel} />
        </main>
      </div>
    );
  }

  const data = await getClanDashboard(clanId);
  if ("error" in data) notFound();

  const messages = await listClanMessages(clanId);
  const msgList = "error" in messages ? [] : messages;

  const pending = await listPendingJoinRequests(clanId);
  const isLeader = data.clan.leader_id === user.id;
  // Resolve label server side
  const divisionLabel = resolveDivName(data.clan.focus_division_key ?? null);

  return (
    <div className={mentrixStudent.pageBg}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/clan">← Clans</Link>
          </Button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            <Image
              src="/icons/mentrixer.svg"
              alt=""
              width={13}
              height={13}
              className="size-[13px] shrink-0"
              aria-hidden
            />
            Mentrixer
          </span>
        </div>

        <ClanDashboardClient
          data={data}
          initialMessages={msgList}
          pending={pending}
          currentUserId={user.id}
          isLeader={isLeader}
          divisionLabel={divisionLabel}
          divisions={divisionOptions}
        />
      </main>
    </div>
  );
}
