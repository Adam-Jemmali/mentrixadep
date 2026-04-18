import Link from "next/link";
import Image from "next/image";
import { requireRole } from "@/lib/auth";
import { getMyClan } from "@/app/actions/clan";
import { Button } from "@/components/ui/button";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { ClanBrowseClient } from "./clan-browse-client";

export const metadata = { title: "Clans · Mentrixa" };

export default async function StudentClanHubPage() {
  await requireRole(["student", "admin"]);
  const my = await getMyClan();

  return (
    <div className={mentrixStudent.pageBg}>
      <main className={mentrixStudent.mainSlim}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={mentrixStudent.sectionEyebrow}>Squad up</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Clans</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              Team with other Mentrixers, track weekly momentum, and coordinate in clan chat.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Image src="/icons/mentrixer.svg" alt="Mentrixer" width={13} height={13} />
              Mentrixer
            </span>
            <Button asChild size="sm" className="rounded-full bg-blue-600 font-semibold shadow-md shadow-blue-500/20 hover:bg-blue-500">
              <Link href="/student/clan/create">Create a clan</Link>
            </Button>
          </div>
        </div>

        {my.clan ? (
          <div className={`${mentrixStudent.card} mt-8 p-5`}>
            <p className="text-sm text-slate-600">
              You’re in{" "}
              <span className="font-bold text-slate-900">{my.clan.name}</span>
              <span className="ml-1 font-mono text-xs text-slate-400">[{my.clan.tag}]</span>
            </p>
            <Button className="mt-4 rounded-full font-semibold" size="sm" asChild>
              <Link href={`/student/clan/${my.clan.id}`}>Open clan dashboard</Link>
            </Button>
          </div>
        ) : null}

        <div className="mt-10">
          <h2 className="text-base font-bold text-slate-900">Find a public clan</h2>
          <p className="mt-1 mb-4 text-xs text-slate-500">
            Search by name. Open clans let you join in one step; approval clans notify the leader.
          </p>
          <ClanBrowseClient />
        </div>
      </main>
    </div>
  );
}
