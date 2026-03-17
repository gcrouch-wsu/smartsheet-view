import { DataAccordion } from "@/components/public/DataAccordion";
import { DataCards } from "@/components/public/DataCards";
import { DataList } from "@/components/public/DataList";
import { DataListDetail } from "@/components/public/DataListDetail";
import { DataStacked } from "@/components/public/DataStacked";
import { DataTabbed } from "@/components/public/DataTabbed";
import { DataTable } from "@/components/public/DataTable";
import type { LayoutType, ResolvedView } from "@/lib/config/types";

export function formatLayoutLabel(layout: LayoutType) {
  return layout
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function PublicViewRenderer({ layout, view }: { layout: LayoutType; view: ResolvedView }) {
  if (layout === "cards") {
    return <DataCards view={view} />;
  }
  if (layout === "list") {
    return <DataList view={view} />;
  }
  if (layout === "stacked") {
    return <DataStacked view={view} />;
  }
  if (layout === "accordion") {
    return <DataAccordion view={view} />;
  }
  if (layout === "tabbed") {
    return <DataTabbed view={view} />;
  }
  if (layout === "list_detail") {
    return <DataListDetail view={view} />;
  }
  return <DataTable view={view} />;
}
