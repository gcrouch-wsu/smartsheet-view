import type { PublicPageSummary, SourceConfig, ViewConfig } from "@/lib/config/types";

export interface ConfigStore {
  listSourceConfigs(): Promise<SourceConfig[]>;
  listViewConfigs(): Promise<ViewConfig[]>;
  getSourceConfigById(sourceId: string): Promise<SourceConfig | null>;
  getViewConfigById(viewId: string): Promise<ViewConfig | null>;
  getPublicViewsBySlug(slug: string, options?: { includePrivate?: boolean }): Promise<ViewConfig[]>;
  listPublicPageSummaries(): Promise<PublicPageSummary[]>;
}
