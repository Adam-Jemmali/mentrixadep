import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { loadGuidePortfolioAll } from "@/features/guide-portfolio/reads";
import { GuideTeachingPortfolioSection } from "@/features/guide-portfolio/ui/guide-teaching-portfolio-section";
import { shouldShowGuidePortfolio } from "@/features/guide-portfolio/guide-portfolio-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

type Props = { params: Promise<{ tutorId: string }> };

export default async function GuidePortfolioPage({ params }: Props) {
  const { tutorId } = await params;
  const admin = createAdminClient();

  const [{ data: tutor }, cards] = await Promise.all([
    admin
      .from("users")
      .select("id, role, approved")
      .eq("id", tutorId)
      .eq("role", "tutor")
      .eq("approved", true)
      .maybeSingle(),
    loadGuidePortfolioAll(tutorId),
  ]);

  if (!tutor || !shouldShowGuidePortfolio(cards.length)) notFound();

  const { data: settings } = await admin
    .from("user_settings")
    .select("display_name")
    .eq("user_id", tutorId)
    .maybeSingle();

  const name =
    typeof settings?.display_name === "string" && settings.display_name.trim()
      ? settings.display_name.trim()
      : "Guide";

  return (
    <div className={mentrixStudent.pageBgArena}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          href={`/tutor/${tutorId}`}
          className="text-sm font-semibold text-[#7C3AED] underline-offset-2 hover:underline"
        >
          Back to {name}
        </Link>
        <div className="mt-6">
          <GuideTeachingPortfolioSection
            cards={cards}
            hasMore={false}
            guideId={tutorId}
          />
        </div>
      </div>
    </div>
  );
}
