import type { ConfigStore } from "@/lib/config/store-interface";
import * as fileStore from "@/lib/config/file-store";

const store: ConfigStore = fileStore;

export const {
  listSourceConfigs,
  listViewConfigs,
  getSourceConfigById,
  getViewConfigById,
  getPublicViewsBySlug,
  listPublicPageSummaries,
} = store;
