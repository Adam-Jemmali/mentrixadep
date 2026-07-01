import { requireRole } from "@/shared/core/auth";
import { getDivisionHubCards } from "@/features/divisions/divisions";
import {
  arenaLeaguePageSubtitle,
  arenaLeaguePageTitle,
} from "@/features/divisions/arena-hub-messages-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { DivisionHubClient } from "./division-hub-client";

export const metadata = { title: "Arena · Mentrixa" };

export default async function DivisionsHubPage() {
  const user = await requireRole(["student", "admin"]);
  const cards = await getDivisionHubCards(user.id);

  return (
    <div className={mentrixStudent.pageBgArena}>
      <div className={mentrixStudent.mainWide}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={mentrixStudent.sectionEyebrow}>Arena</p>
            <h1 className={`mt-2 ${mentrixStudent.pageTitle}`}>{arenaLeaguePageTitle()}</h1>
            <p className={`mt-2 max-w-xl ${mentrixStudent.pageSubtitle}`}>
              {arenaLeaguePageSubtitle()}
            </p>
          </div>
        </div>

        <DivisionHubClient initialCards={cards} />
      </div>
    </div>
  );
}
