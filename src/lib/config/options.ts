import type { FilterOperator, LayoutType, RenderType } from "@/lib/config/types";

export const LAYOUT_OPTIONS: LayoutType[] = ["table", "cards", "list", "tabbed", "stacked", "accordion", "list_detail"];
export const RENDER_TYPE_OPTIONS: RenderType[] = [
  "text",
  "multiline_text",
  "list",
  "mailto",
  "mailto_list",
  "phone",
  "phone_list",
  "link",
  "date",
  "badge",
  "hidden",
];
export const FILTER_OPERATOR_OPTIONS: FilterOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "in",
  "not_in",
  "is_empty",
  "not_empty",
];
export const TRANSFORM_OPTIONS = [
  "trim",
  "split",
  "coalesce",
  "reset_to_source",
  "extract_emails",
  "extract_phones",
  "dedupe",
  "filter_empty",
  "to_contact_list",
  "contact_names",
  "contact_emails",
  "join",
  "lowercase",
  "uppercase",
  "format_date",
  "url_from_value",
] as const;
