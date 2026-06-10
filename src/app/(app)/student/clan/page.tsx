import { getTopPublicClans } from "@/features/clans/clan-reads";
import { getMyClan } from "@/features/clans/clan-membership";
import Link from "next/link";
import Image from "next/image";
import { requireRole } from "@/shared/core/auth";


import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { clanArenaLightSection, clanArenaLightSubtitle, clanArenaLightTitle } from "@/features/clans/clan-light-form-ui";
import { ClanBrowseClient } from "./clan-browse-client";
import { Typewriter } from "@/shared/ui/typewriter";
import { TiltCard } from "@/shared/ui/tilt-card";
import { BackButton } from "@/shared/ui/back-button";

export const metadata = { title: "Clans · Mentrixa" };

export default async function StudentClanHubPage() {
  await requireRole(["student", "admin"]);
  const [my, topClans] = await Promise.all([getMyClan(), getTopPublicClans(8)]);

  return (
    <div className={mentrixStudent.pageBgArena}>
      <main className={mentrixStudent.mainWide}>
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={mentrixStudent.sectionEyebrow}>Squad up</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-100 h-[32px]">
              <Typewriter text="Clans" speed={70} waitTime={8000} />
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-300">
              Team with other Mentrixers, track weekly momentum, and coordinate in clan chat.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-500 bg-slate-900/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-200">
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
            <Button asChild variant="arenaPrimary" size="sm" className="rounded-xl font-semibold">
              <Link href="/student/clan/create">Create a clan</Link>
            </Button>
          </div>
        </div>

        {my.clan ? (
          <TiltCard
            tiltLimit={5}
            scale={1.02}
            className={`${mentrixStudent.card} mt-8 block border border-violet-200 bg-white p-5 text-zinc-950`}
          >
            <p className="text-sm text-zinc-700">
              You’re in{" "}
              <span className="font-bold text-zinc-950">{my.clan.name}</span>
              <span className="ml-1 font-mono text-xs text-zinc-600">[{my.clan.tag}]</span>
            </p>
            <Button
              className="mt-4 rounded-full font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
              size="sm"
              asChild
            >
              <Link href={`/student/clan/${my.clan.id}`}>Open clan dashboard</Link>
            </Button>
          </TiltCard>
        ) : null}

        <div className={`${clanArenaLightSection} mt-10`}>
          <h2 className={clanArenaLightTitle}>Find a public clan</h2>
          <p className={`${clanArenaLightSubtitle} mt-1 mb-5`}>
            Search by name. Open clans let you join in one step; approval clans notify the leader.
          </p>
          <ClanBrowseClient topClans={topClans} />
        </div>
      </main>
    </div>
  );
}
