import { redirect } from "next/navigation";

/** Clans replaced by Division Wars — route kept for old bookmarks only. */
export default function StudentClanHubPage() {
  redirect("/student/division");
}
