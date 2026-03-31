"use client";

import { createContext, useContext } from "react";

interface AdminViewContext {
  viewingAsUserId: string | null;
}

const AdminViewCtx = createContext<AdminViewContext>({ viewingAsUserId: null });

export function AdminViewProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return (
    <AdminViewCtx.Provider value={{ viewingAsUserId: userId }}>
      {children}
    </AdminViewCtx.Provider>
  );
}

export function useAdminViewContext() {
  return useContext(AdminViewCtx);
}
