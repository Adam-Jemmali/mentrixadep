import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { QuestPageClient } from "./quest-page-client";

export const metadata = { title: "Quest. Mentrixa" };

export const maxDuration = 120;

const AP_CALC_SUBJECT_OPTIONS = [{ key: "ap-calculus-ab", name: AP_CALC_AB_SUBJECT }];

export default async function QuestPage() {
  return <QuestPageClient subjectOptions={AP_CALC_SUBJECT_OPTIONS} />;
}
