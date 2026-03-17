export type SourceType = "sheet" | "report";
export type LayoutType = "table" | "cards" | "list" | "tabbed" | "stacked" | "accordion" | "list_detail";
export type RenderType =
  | "text"
  | "multiline_text"
  | "list"
  | "mailto"
  | "mailto_list"
  | "phone"
  | "phone_list"
  | "link"
  | "date"
  | "badge"
  | "hidden";
export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "in"
  | "not_in"
  | "is_empty"
  | "not_empty";

export interface SourceConfig {
  id: string;
  label: string;
  sourceType: SourceType;
  smartsheetId: number;
  connectionKey?: string;
  apiBaseUrl?: string;
  cacheTtlSeconds?: number;
  fetchOptions?: {
    includeObjectValue?: boolean;
    includeColumnOptions?: boolean;
    level?: number;
  };
}

export interface FieldSourceSelector {
  columnId?: number;
  columnTitle?: string;
  columnType?: string;
}

export interface ViewFieldSource extends FieldSourceSelector {
  preferredColumnId?: number;
  preferredColumnTitle?: string;
  preferredColumnType?: string;
  fallbackColumnId?: number;
  fallbackColumnTitle?: string;
  fallbackColumnType?: string;
  coalesce?: FieldSourceSelector[];
}

export interface TransformConfig {
  op: string;
  delimiter?: string;
  delimiters?: string[];
  separator?: string;
  locale?: string;
  dateStyle?: "full" | "long" | "medium" | "short";
  timeStyle?: "full" | "long" | "medium" | "short";
}

export interface ViewFieldRender {
  type: RenderType;
  emptyLabel?: string;
}

export interface ViewFieldConfig {
  key: string;
  label: string;
  source: ViewFieldSource;
  transforms?: TransformConfig[];
  render: ViewFieldRender;
  emptyBehavior?: "show" | "hide";
  description?: string;
}

export interface ViewFilterConfig {
  columnId?: number;
  columnTitle?: string;
  columnType?: string;
  op: FilterOperator;
  value?: string | number | boolean | Array<string | number | boolean>;
}

export interface ViewSortConfig {
  field: string;
  direction: "asc" | "desc";
}

export interface ViewPresentationConfig {
  /** Field used as the main heading in cards, accordions, etc. */
  headingFieldKey?: string;
  /** Field shown as subtitle under the heading. */
  summaryFieldKey?: string;
  /** Field used for A-Z index and search. Defaults to heading if not set. */
  indexFieldKey?: string;
  /** Hide the "Row N" badge in stacked/tabbed layouts. */
  hideRowBadge?: boolean;
}

export interface ViewStyleConfig {
  backgroundColor?: string;
  cardBackground?: string;
  accentColor?: string;
  textColor?: string;
  mutedColor?: string;
  borderColor?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  borderRadius?: string;
  cardShadow?: string;
  badgeBg?: string;
  badgeText?: string;
  /** @deprecated Use accentColor. Kept for backward compatibility. */
  primaryColor?: string;
}

export interface ThemeConfig {
  id: string;
  label: string;
  tokens: Partial<ViewStyleConfig>;
}

export interface ViewConfig {
  id: string;
  slug: string;
  sourceId: string;
  label: string;
  description?: string;
  layout: LayoutType;
  public: boolean;
  tabOrder?: number;
  filters?: ViewFilterConfig[];
  defaultSort?: ViewSortConfig[];
  presentation?: ViewPresentationConfig;
  style?: ViewStyleConfig;
  /** When true, hide the layout switcher; only use the view's default layout. */
  fixedLayout?: boolean;
  /** Theme preset id (e.g. wsu_crimson). When unset, WSU Crimson is used. */
  themePresetId?: string;
  fields: ViewFieldConfig[];
}

export interface PublicPageSummary {
  slug: string;
  title: string;
  sourceId: string;
  sourceLabel: string;
  views: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
}

export interface SmartsheetColumn {
  id: number;
  index: number;
  title: string;
  type: string;
  options?: string[];
  locked?: boolean;
}

export interface SmartsheetCell {
  columnId: number;
  columnTitle: string;
  columnType: string;
  value: unknown;
  displayValue?: string;
  objectValue?: unknown;
}

export interface SmartsheetRow {
  id: number;
  sheetId?: number;
  cellsById: Record<number, SmartsheetCell>;
  cellsByTitle: Record<string, SmartsheetCell>;
}

export interface SmartsheetDataset {
  sourceType: SourceType;
  id: number;
  name: string;
  columns: SmartsheetColumn[];
  rows: SmartsheetRow[];
  fetchedAt: string;
}

export interface PublicLink {
  label: string;
  href: string;
}

export interface ContactValue {
  name?: string;
  email?: string;
}

export interface ResolvedFieldValue {
  key: string;
  label: string;
  renderType: RenderType;
  textValue: string;
  sortValue?: string;
  listValue: string[];
  links: PublicLink[];
  isEmpty: boolean;
  hideWhenEmpty: boolean;
}

export interface ResolvedViewRow {
  id: number;
  fields: ResolvedFieldValue[];
  fieldMap: Record<string, ResolvedFieldValue>;
}

export interface ResolvedViewField {
  key: string;
  label: string;
  renderType: RenderType;
  description?: string;
}

export interface ResolvedView {
  id: string;
  label: string;
  description?: string;
  layout: LayoutType;
  presentation?: ViewPresentationConfig;
  style?: ViewStyleConfig;
  themePresetId?: string;
  fixedLayout?: boolean;
  rowCount: number;
  fields: ResolvedViewField[];
  rows: ResolvedViewRow[];
}

export interface ResolvedPublicPage {
  slug: string;
  title: string;
  source: {
    id: string;
    label: string;
    name: string;
    sourceType: SourceType;
  };
  views: ResolvedView[];
  defaultViewId: string;
  fetchedAt: string;
}
