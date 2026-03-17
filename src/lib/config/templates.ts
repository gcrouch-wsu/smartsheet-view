import type { LayoutType, ViewConfig } from "@/lib/config/types";

export interface ViewTemplateDefinition {
  id: string;
  label: string;
  description: string;
  layout: LayoutType;
}

export const VIEW_TEMPLATES: ViewTemplateDefinition[] = [
  {
    id: "directory_table",
    label: "Directory Table",
    description: "Classic directory layout with sortable name-first rows.",
    layout: "table",
  },
  {
    id: "directory_cards",
    label: "Directory Cards",
    description: "Card-based profile grid for medium-sized people directories.",
    layout: "cards",
  },
  {
    id: "directory_stacked",
    label: "Directory Stacked",
    description: "Full-width record cards with more breathing room per row.",
    layout: "stacked",
  },
  {
    id: "directory_accordion",
    label: "Directory Accordion",
    description: "Collapsed summary rows that open into full details.",
    layout: "accordion",
  },
  {
    id: "directory_tabbed",
    label: "Directory Tabbed",
    description: "Tabbed detail browsing for smaller curated sets.",
    layout: "tabbed",
  },
  {
    id: "directory_list_detail",
    label: "Directory List Detail",
    description: "Master-detail pattern with a navigable list and full detail panel.",
    layout: "list_detail",
  },
];

/** Apply a template: sets layout only. Fields come from the columns you select in the Fields tab. */
export function applyViewTemplate(current: ViewConfig, templateId: string): ViewConfig {
  const template = VIEW_TEMPLATES.find((entry) => entry.id === templateId);
  if (!template) {
    return current;
  }

  return {
    ...current,
    layout: template.layout,
    defaultSort: [],
    presentation: {
      ...current.presentation,
      headingFieldKey: current.presentation?.headingFieldKey ?? "",
      summaryFieldKey: current.presentation?.summaryFieldKey ?? "",
    },
    fields: current.fields,
  };
}
