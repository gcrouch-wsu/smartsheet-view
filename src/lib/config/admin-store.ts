import type { SourceConfig, ViewConfig } from "@/lib/config/types";
import * as configDb from "@/lib/config/config-db";
import * as fileStore from "@/lib/config/file-store";

function getAdminStore() {
  return configDb.useConfigDatabase() ? configDb : fileStore;
}

export const saveSourceConfig = (config: SourceConfig) => getAdminStore().saveSourceConfig(config);
export const saveViewConfig = (config: ViewConfig) => getAdminStore().saveViewConfig(config);
export const deleteSourceConfig = (sourceId: string) => getAdminStore().deleteSourceConfig(sourceId);
export const deleteViewConfig = (viewId: string) => getAdminStore().deleteViewConfig(viewId);
export const updateViewPublication = (viewId: string, isPublic: boolean) =>
  getAdminStore().updateViewPublication(viewId, isPublic);