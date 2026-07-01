import { StudentProductTypography } from "./student-product-typography";

export default function StudentSectionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <StudentProductTypography>{children}</StudentProductTypography>;
}
