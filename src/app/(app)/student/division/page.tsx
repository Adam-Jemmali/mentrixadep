import { requireRole } from "@/lib/auth";
import { getDivisionHubCards } from "@/app/actions/divisions";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { DivisionHubClient } from "./division-hub-client";

export const metadata = { title: "Divisions · Mentrixa" };

export default async function DivisionsHubPage() {
  const user = await requireRole(["student", "admin"]);
  const cards = await getDivisionHubCards(user.id);

  return (
    <div className={mentrixStudent.pageBgArena}>
      <div className={mentrixStudent.mainWide}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={mentrixStudent.sectionEyebrow}>Arena & leagues</p>
            <h1 className={`mt-2 ${mentrixStudent.pageTitle}`}>Divisions</h1>
            <p className={`mt-2 max-w-xl ${mentrixStudent.pageSubtitle}`}>
              Join subject communities, climb the weekly XP board , and coordinate with other Mentrixers. Set a focus division.
            </p>
          </div>
        </div>

        <DivisionHubClient initialCards={cards} />
      </div>
    </div>
  );
}
