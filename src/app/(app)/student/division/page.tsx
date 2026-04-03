import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getDivisionHubCards } from "@/app/actions/divisions";
import { DivisionHubClient } from "./division-hub-client";

export const metadata = { title: "Divisions · Mentrixa" };

export default async function DivisionsHubPage() {
  const user = await requireRole(["student", "admin"]);
  const cards = await getDivisionHubCards(user.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Subject communities
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Divisions
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-xl leading-relaxed">
              Join subjects you care about, climb the weekly XP board (resets Monday UTC), and
              chat with peers. Set one division as your focus for navigation and duels.
            </p>
          </div>
          <Link
            href="/student/division/arena"
            className="text-sm text-mentrixa-600 hover:underline shrink-0"
          >
            Classic arena view →
          </Link>
        </div>

        <DivisionHubClient initialCards={cards} />
      </div>
    </div>
  );
}
