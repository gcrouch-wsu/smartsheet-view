import type { ConfigAdminStore } from "@/lib/config/admin-store-interface";
import * as fileStore from "@/lib/config/file-store";

const adminStore: ConfigAdminStore = fileStore;

export const {
  saveSourceConfig,
  saveViewConfig,
  deleteSourceConfig,
  deleteViewConfig,
  updateViewPublication,
} = adminStore;