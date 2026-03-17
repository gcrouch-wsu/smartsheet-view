import type { LayoutType, ViewConfig, ViewFieldConfig } from "@/lib/config/types";

export interface ViewTemplateDefinition {
  id: string;
  label: string;
  description: string;
  layout: LayoutType;
}

const DIRECTORY_FIELDS: ViewFieldConfig[] = [
  {
    key: "name",
    label: "Name",
    source: { columnTitle: "Name" },
    transforms: [{ op: "trim" }],
    render: { type: "text" },
  },
  {
    key: "role",
    label: "Role",
    source: { columnTitle: "Role" },
    transforms: [{ op: "trim" }],
    render: { type: "badge" },
    emptyBehavior: "hide",
  },
  {
    key: "email",
    label: "Email",
    source: { columnTitle: "Email" },
    transforms: [{ op: "trim" }],
    render: { type: "mailto" },
    emptyBehavior: "hide",
  },
  {
    key: "phone",
    label: "Phone",
    source: { columnTitle: "Phone" },
    transforms: [{ op: "trim" }],
    render: { type: "phone" },
    emptyBehavior: "hide",
  },
  {
    key: "location",
    label: "Location",
    source: { columnTitle: "Location" },
    transforms: [{ op: "trim" }],
    render: { type: "text" },
    emptyBehavior: "hide",
  },
  {
    key: "notes",
    label: "Notes",
    source: { columnTitle: "Notes" },
    transforms: [{ op: "trim" }],
    render: { type: "multiline_text" },
    emptyBehavior: "hide",
  },
];

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

function cloneFields() {
  return DIRECTORY_FIELDS.map((field) => ({
    ...field,
    source: { ...field.source },
    transforms: field.transforms?.map((transform) => ({ ...transform })),
    render: { ...field.render },
  }));
}

export function applyViewTemplate(current: ViewConfig, templateId: string): ViewConfig {
  const template = VIEW_TEMPLATES.find((entry) => entry.id === templateId);
  if (!template) {
    return current;
  }

  return {
    ...current,
    layout: template.layout,
    defaultSort: [{ field: "name", direction: "asc" }],
    presentation: {
      headingFieldKey: "name",
      summaryFieldKey: "role",
    },
    fields: cloneFields(),
  };
}
