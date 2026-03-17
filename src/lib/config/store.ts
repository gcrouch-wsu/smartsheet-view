import type { ConfigStore } from "@/lib/config/store-interface";
import * as configDb from "@/lib/config/config-db";
import * as fileStore from "@/lib/config/file-store";

function getStore(): ConfigStore {
  return configDb.useConfigDatabase() ? configDb : fileStore;
}

export const listSourceConfigs = () => getStore().listSourceConfigs();
export const listViewConfigs = () => getStore().listViewConfigs();
export const getSourceConfigById = (id: string) => getStore().getSourceConfigById(id);
export const getViewConfigById = (id: string) => getStore().getViewConfigById(id);
export const getPublicViewsBySlug = (slug: string) => getStore().getPublicViewsBySlug(slug);
export const listPublicPageSummaries = () => getStore().listPublicPageSummaries();
