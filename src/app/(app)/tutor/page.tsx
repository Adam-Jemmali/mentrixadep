import { getTutorCommandCenterData } from "@/app/actions/tutor";
import { TutorCommandCenterClient } from "./tutor-command-center-client";

export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const data = await getTutorCommandCenterData();

  return (
    <div className="min-h-screen bg-neutral-50">
      <TutorCommandCenterClient data={data} />
    </div>
  );
}
