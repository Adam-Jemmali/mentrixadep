import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDivisionsCatalog } from "@/app/actions/quest";
import {
  getClanDashboard,
  getPublicClanSnapshot,
  listClanMessages,
  listPendingJoinRequests,
} from "@/app/actions/clan-dashboard";
import { Button } from "@/components/ui/button";
import { ClanDashboardClient } from "./clan-dashboard-client";
import { ClanPublicPreview } from "./clan-public-preview";

export const metadata = { title: "Clan · Mentrixa" };

interface Props {
  params: Promise<{ clanId: string }>;
}

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
  const resolveDivName = (key: string | null) =>
    key ? divisions.find((d) => d.key === key)?.name ?? key : "—";

  if (!mem?.clan_id) {
    const snap = await getPublicClanSnapshot(clanId);
    if (!snap) notFound();
    // Resolve the label to a plain string before crossing the server→client boundary
    const divisionLabel = resolveDivName(snap.focus_division_key ?? null);
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student/clan">← Clans</Link>
            </Button>
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
  // Resolve label server-side — never pass functions to Client Components
  const divisionLabel = resolveDivName(data.clan.focus_division_key ?? null);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/clan">← Clans</Link>
          </Button>
        </div>

        <ClanDashboardClient
          data={data}
          initialMessages={msgList}
          pending={pending}
          currentUserId={user.id}
          isLeader={isLeader}
          divisionLabel={divisionLabel}
        />
      </main>
    </div>
  );
}
