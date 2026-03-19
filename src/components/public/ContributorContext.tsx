"use client";

import { createContext, useContext } from "react";
import type { ContributorEditingClientConfig } from "@/lib/contributor-utils";

export interface ContributorContextValue {
  email: string | null;
  viewId: string;
  editingConfig: ContributorEditingClientConfig | null;
  editableRowIds: number[];
  signOut: () => Promise<void>;
}

const ContributorContext = createContext<ContributorContextValue | null>(null);

export function ContributorProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ContributorContextValue;
}) {
  return <ContributorContext.Provider value={value}>{children}</ContributorContext.Provider>;
}

export function useContributorContext() {
  return useContext(ContributorContext);
}
