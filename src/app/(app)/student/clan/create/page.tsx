import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getDivisionsCatalog } from "@/app/actions/quest";
import { Button } from "@/components/ui/button";
import { ClanCreateForm } from "./clan-create-form";

export const metadata = { title: "Create clan · Mentrixa" };

export default async function CreateClanPage() {
  await requireRole(["student", "admin"]);
  const divisions = await getDivisionsCatalog();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/student/clan">← Clans</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Create a clan
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-8 max-w-md">
          You’ll be the leader. Up to 20 learners per clan. Invite code is generated
          automatically (6 characters).
        </p>
        <ClanCreateForm divisions={divisions} />
      </main>
    </div>
  );
}
