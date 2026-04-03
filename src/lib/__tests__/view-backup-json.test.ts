import { describe, expect, it } from "vitest";
import { parseViewConfigFromBackupJson } from "@/lib/view-backup-json";

const minimalField = {
  key: "name",
  label: "Name",
  source: { columnTitle: "Name" },
  render: { type: "text" as const },
};

const bareView = {
  id: "view-1",
  sourceId: "grad-programs",
  slug: "public-slug",
  layout: "table" as const,
  label: "Label",
  public: false,
  fields: [minimalField],
};

describe("parseViewConfigFromBackupJson", () => {
  it("rejects arrays", () => {
    const r = parseViewConfigFromBackupJson([]);
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.error).toContain("object");
  });

  it("rejects slim exports", () => {
    const r = parseViewConfigFromBackupJson({ format: "slim", rows: [] });
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.error.toLowerCase()).toContain("slim");
  });

  it("accepts viewConfig envelope", () => {
    const r = parseViewConfigFromBackupJson({ viewConfig: bareView, fetchedAt: "x" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.id).toBe("view-1");
    }
  });

  it("accepts GET /api/admin/views envelope", () => {
    const r = parseViewConfigFromBackupJson({ view: bareView });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.slug).toBe("public-slug");
    }
  });

  it("accepts bare view object", () => {
    const r = parseViewConfigFromBackupJson(bareView);
    expect(r.ok).toBe(true);
  });

  it("accepts single-entry viewConfigs array", () => {
    const r = parseViewConfigFromBackupJson({ viewConfigs: [bareView] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.id).toBe("view-1");
    }
  });

  it("picks defaultViewId when viewConfigs has multiple entries", () => {
    const other = { ...bareView, id: "view-2", slug: "other" };
    const r = parseViewConfigFromBackupJson({
      viewConfigs: [bareView, other],
      defaultViewId: "view-2",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.id).toBe("view-2");
    }
  });

  it("errors when multiple viewConfigs and no matching defaultViewId", () => {
    const other = { ...bareView, id: "view-2", slug: "other" };
    const r = parseViewConfigFromBackupJson({
      viewConfigs: [bareView, other],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("multiple views");
    }
  });

  it("errors when multiple viewConfigs and defaultViewId unknown", () => {
    const other = { ...bareView, id: "view-2", slug: "other" };
    const r = parseViewConfigFromBackupJson({
      viewConfigs: [bareView, other],
      defaultViewId: "nope",
    });
    expect(r.ok).toBe(false);
  });
});
