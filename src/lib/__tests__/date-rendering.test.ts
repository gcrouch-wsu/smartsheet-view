import { describe, expect, it } from "vitest";
import { buildResolvedFieldValue } from "@/lib/transforms";
import type { ViewFieldConfig } from "@/lib/config/types";

describe("date rendering bug reproduction", () => {
  it("formats 2026-01-08 as Jan 8, 2026 regardless of runtime timezone", () => {
    const field: ViewFieldConfig = {
      key: "date",
      label: "Date",
      source: { columnTitle: "Date" },
      render: { type: "date" },
    };

    const result = buildResolvedFieldValue(field, "2026-01-08");

    expect(result.textValue).toContain("Jan 8");
    expect(result.textValue).toContain("2026");
  });
});
