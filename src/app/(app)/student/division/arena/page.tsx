import { redirect } from "next/navigation";

export const metadata = { title: "Division arena. Mentrixa" };

export default async function DivisionArenaPage() {
  redirect("/student/division");
}
