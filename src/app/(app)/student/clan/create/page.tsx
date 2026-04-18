import Link from "next/link";
import Image from "next/image";
import { requireRole } from "@/lib/auth";
import { getDivisionsCatalog } from "@/app/actions/quest";
import { Button } from "@/components/ui/button";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { ClanCreateForm } from "./clan-create-form";

export const metadata = { title: "Create clan · Mentrixa" };

export default async function CreateClanPage() {
  await requireRole(["student", "admin"]);
  const divisions = await getDivisionsCatalog();

  return (
    <div className={mentrixStudent.pageBg}>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/clan">← Clans</Link>
          </Button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            <Image src="/icons/mentrixer.svg" alt="Mentrixer" width={13} height={13} />
            Mentrixer
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Create a clan
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-8 max-w-md">
          You’ll be the leader. Up to 20 Mentrixers per clan. Invite code is generated
          automatically (6 characters).
        </p>
        <ClanCreateForm divisions={divisions} />
      </main>
    </div>
  );
}
