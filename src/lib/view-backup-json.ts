import type { ViewConfig } from "@/lib/config/types";

function backupObjectLooksLikeViewConfig(candidate: unknown): candidate is Record<string, unknown> {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return false;
  }
  const c = candidate as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    Boolean(c.id.trim()) &&
    typeof c.sourceId === "string" &&
    Boolean(c.sourceId.trim()) &&
    typeof c.layout === "string" &&
    Array.isArray(c.fields)
  );
}

/** Accepts full admin export (`viewConfig`), bundle (`viewConfigs`), GET view payload (`view`), or a raw `ViewConfig` object. */
export function parseViewConfigFromBackupJson(
  raw: unknown,
): { ok: true; config: ViewConfig } | { ok: false; error: string } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "File must contain a JSON object (not an array)." };
  }
  const root = raw as Record<string, unknown>;
  if (root.format === "slim") {
    return {
      ok: false,
      error: "Slim exports only include row snapshots. Use “Export JSON” for a restorable backup.",
    };
  }
  let candidate: unknown | undefined;
  if (root.viewConfig && typeof root.viewConfig === "object" && !Array.isArray(root.viewConfig)) {
    candidate = root.viewConfig;
  } else if (Array.isArray(root.viewConfigs)) {
    const configs = root.viewConfigs.filter(backupObjectLooksLikeViewConfig);
    if (configs.length === 0) {
      return { ok: false, error: "Found viewConfigs but no valid view entries." };
    }
    if (configs.length === 1) {
      candidate = configs[0];
    } else {
      const wantId = typeof root.defaultViewId === "string" ? root.defaultViewId.trim() : "";
      const picked = wantId ? configs.find((v) => v.id === wantId) : undefined;
      if (!picked) {
        return {
          ok: false,
          error:
            "This file lists multiple views. Add a defaultViewId that matches one of the view ids, or export a single view from the admin “Export JSON” link.",
        };
      }
      candidate = picked;
    }
  } else if (root.view && typeof root.view === "object" && !Array.isArray(root.view)) {
    candidate = root.view;
  } else if (backupObjectLooksLikeViewConfig(raw)) {
    candidate = raw;
  }
  if (candidate === undefined || !backupObjectLooksLikeViewConfig(candidate)) {
    return {
      ok: false,
      error:
        "Could not find a restorable view. Use a full “Export JSON” backup (includes viewConfig), a GET /api/admin/views/{id} response, or a single view object with id, sourceId, layout, and fields.",
    };
  }
  return { ok: true, config: candidate as unknown as ViewConfig };
}
