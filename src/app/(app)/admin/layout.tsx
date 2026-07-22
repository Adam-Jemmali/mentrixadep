import type { Metadata } from "next";
import { requireRole } from "@/shared/core/auth";
import { AdminSidebar } from "./admin-sidebar";

export const metadata: Metadata = {
  title: "Admin. Mentrixa",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
