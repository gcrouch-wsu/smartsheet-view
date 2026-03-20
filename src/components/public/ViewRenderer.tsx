import { DataAccordion } from "@/components/public/DataAccordion";
import { DataCards } from "@/components/public/DataCards";
import { DataList } from "@/components/public/DataList";
import { DataListDetail } from "@/components/public/DataListDetail";
import { DataStacked } from "@/components/public/DataStacked";
import { DataTabbed } from "@/components/public/DataTabbed";
import { DataTable } from "@/components/public/DataTable";
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
  if (layout === "cards") {
    return <DataCards view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />;
  }
  if (layout === "list") {
    return <DataList view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />;
  }
  if (layout === "stacked") {
    return <DataStacked view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />;
  }
  if (layout === "accordion") {
    return <DataAccordion view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />;
  }
  if (layout === "tabbed") {
    return <DataTabbed view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />;
  }
  if (layout === "list_detail") {
    return <DataListDetail view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />;
  }
  return <DataTable view={view} editableRowIds={editableRowIds} onEditRow={onEditRow} />;
}
