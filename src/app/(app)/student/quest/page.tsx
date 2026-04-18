import { getDivisionsCatalog } from "@/app/actions/quest";
import { getCurrentUser } from "@/lib/auth";
import { QuestPageClient } from "./quest-page-client";

export const metadata = { title: "Quest · Mentrixa" };

/** Server actions that call Gemini for practice packs need time (see PRACTICE_PACK_TIMEOUT_MS + retry). */
export const maxDuration = 300;

export default async function QuestPage() {
  const divisions = await getDivisionsCatalog();
  const subjectOptions = divisions.map((d) => ({ key: d.key, name: d.name }));
  const user = await getCurrentUser();

  return <QuestPageClient subjectOptions={subjectOptions} user={user} />;
}
