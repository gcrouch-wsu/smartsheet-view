import { describe, expect, it } from "vitest";
import { applyViewTemplate } from "@/lib/config/templates";
import type { ViewConfig } from "@/lib/config/types";

const BASE_VIEW: ViewConfig = {
  id: "faculty",
  slug: "grad-programs",
  sourceId: "grad-programs",
  label: "Faculty",
  layout: "table",
  public: false,
  fields: [
    {
      key: "placeholder",
      label: "Placeholder",
      source: { columnTitle: "Placeholder" },
      render: { type: "text" },
    },
  ],
};

describe("applyViewTemplate", () => {
  it("applies the requested layout template without changing fields", () => {
    const result = applyViewTemplate(BASE_VIEW, "directory_list_detail");

    expect(result.id).toBe(BASE_VIEW.id);
    expect(result.slug).toBe(BASE_VIEW.slug);
    expect(result.sourceId).toBe(BASE_VIEW.sourceId);
    expect(result.layout).toBe("list_detail");
    expect(result.fields).toBe(BASE_VIEW.fields);
    expect(result.fields.map((f) => f.key)).toContain("placeholder");
  });
});
