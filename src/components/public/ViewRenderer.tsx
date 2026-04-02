"use client";

import { DataAccordion } from "@/components/public/DataAccordion";
import { DataCards } from "@/components/public/DataCards";
import { DataList } from "@/components/public/DataList";
import { DataListDetail } from "@/components/public/DataListDetail";
import { DataStacked } from "@/components/public/DataStacked";
import { DataTabbed } from "@/components/public/DataTabbed";
import { DataTable } from "@/components/public/DataTable";
import { ViewValueLinkProvider } from "@/components/public/ViewValueLinkContext";
import type { LayoutType, ResolvedView } from "@/lib/config/types";

export interface PublicRowEditingProps {
  editableRowIds?: Set<number>;
  onEditRow?: (rowId: number, triggerElement?: HTMLElement | null) => void;
}

export function formatLayoutLabel(layout: LayoutType) {
  return layout
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function PublicViewRenderer({
  layout,
  view,
  editableRowIds,
  onEditRow,
}: {
  layout: LayoutType;
  view: ResolvedView;
} & PublicRowEditingProps) {
  const linkCtx = {
    linkEmailsInView: view.linkEmailsInView,
    linkPhonesInView: view.linkPhonesInView,
  };

  const body =
    layout === "cards" ? (
      <DataCards view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />
    ) : layout === "list" ? (
      <DataList view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />
    ) : layout === "stacked" ? (
      <DataStacked view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />
    ) : layout === "accordion" ? (
      <DataAccordion view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />
    ) : layout === "tabbed" ? (
      <DataTabbed view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />
    ) : layout === "list_detail" ? (
      <DataListDetail view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />
    ) : (
      <DataTable view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />
    );

  return <ViewValueLinkProvider value={linkCtx}>{body}</ViewValueLinkProvider>;
}
