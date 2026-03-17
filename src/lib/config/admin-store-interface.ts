import type { SourceConfig, ViewConfig } from "@/lib/config/types";

export interface ConfigAdminStore {
  saveSourceConfig(config: SourceConfig): Promise<void>;
  saveViewConfig(config: ViewConfig): Promise<void>;
  deleteSourceConfig(sourceId: string): Promise<void>;
  deleteViewConfig(viewId: string): Promise<void>;
  updateViewPublication(viewId: string, isPublic: boolean): Promise<ViewConfig>;
}