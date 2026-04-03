import { requireRole } from "@/lib/auth";
import { AdminSidebar } from "./admin-sidebar";

export const metadata = { title: "Admin · Mentrixa" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
