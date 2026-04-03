import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getMyClan } from "@/app/actions/clan";
import { Button } from "@/components/ui/button";
import { ClanBrowseClient } from "./clan-browse-client";

export const metadata = { title: "Clans · Mentrixa" };

export default async function StudentClanHubPage() {
  await requireRole(["student", "admin"]);
  const my = await getMyClan();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Clans
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Team up with other learners, track weekly momentum together, and coordinate in
              clan chat.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/student/clan/create">Create a clan</Link>
          </Button>
        </div>

        {my.clan ? (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">
              You’re in{" "}
              <span className="font-medium text-slate-900">{my.clan.name}</span>
              <span className="text-slate-400 font-mono text-xs ml-1">[{my.clan.tag}]</span>
            </p>
            <Button className="mt-3" size="sm" asChild>
              <Link href={`/student/clan/${my.clan.id}`}>Open clan dashboard</Link>
            </Button>
          </div>
        ) : null}

        <div className="mt-10">
          <h2 className="text-sm font-medium text-slate-900">Find a public clan</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Search by name. Open clans let you join in one step; approval clans notify the leader.
          </p>
          <ClanBrowseClient />
        </div>
      </main>
    </div>
  );
}
