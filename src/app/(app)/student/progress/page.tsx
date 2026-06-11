import { redirect } from "next/navigation";

/** Legacy progress dashboard retired — weekly snapshot lives on /student. */
export default function ProgressDashboardPage() {
  redirect("/student");
}
