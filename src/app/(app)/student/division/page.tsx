import { requireRole } from "@/shared/core/auth";
import { getDivisionHubCards } from "@/features/divisions/divisions";
import {
  arenaLeaguePageSubtitle,
  arenaLeaguePageTitle,
} from "@/features/divisions/arena-hub-messages-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { ProductPageHeader } from "@/features/student-profile/ui/product-page-header";
import { STUDENT_ROUTE_HEADER_VARIANT } from "@/features/student-profile/student-sticky-variants";
import { DivisionHubClient } from "./division-hub-client";

export const metadata = { title: "Arena · Mentrixa" };

export default async function DivisionsHubPage() {
  const user = await requireRole(["student", "admin"]);
  const cards = await getDivisionHubCards(user.id);

  return (
    <div className={mentrixStudent.pageBgHub}>
      <div className={mentrixStudent.mainWide}>
        <ProductPageHeader
          icon="league"
          eyebrow="League"
          title={arenaLeaguePageTitle()}
          subtitle={arenaLeaguePageSubtitle()}
          stickyVariant={STUDENT_ROUTE_HEADER_VARIANT.league}
        />

        <DivisionHubClient initialCards={cards} />
      </div>
    </div>
  );
}
