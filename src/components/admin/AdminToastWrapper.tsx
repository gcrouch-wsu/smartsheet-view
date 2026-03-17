"use client";

import { ToastProvider } from "./Toast";

export function AdminToastWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
