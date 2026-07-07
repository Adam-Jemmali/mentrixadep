import { redirect } from "next/navigation";

/** Trajectory certificate export was removed — rank proof lives on the public rank page. */
export default function StudentCertificatePage() {
  redirect("/student");
}
