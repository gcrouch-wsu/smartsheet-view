import { afterEach, describe, expect, it, vi } from "vitest";
import type { SourceConfig, ViewConfig } from "@/lib/config/types";

const adminStoreMock = vi.hoisted(() => ({
  saveViewConfig: vi.fn(),
  updateViewPublication: vi.fn(),
  deleteSourceConfig: vi.fn(),
  deleteViewConfig: vi.fn(),
}));

const storeMock = vi.hoisted(() => ({
  getSourceConfigById: vi.fn(),
  getViewConfigById: vi.fn(),
  listViewConfigs: vi.fn(),
}));

const smartsheetMock = vi.hoisted(() => ({
  getSmartsheetSchema: vi.fn(),
}));

const publicViewMock = vi.hoisted(() => ({
  collectSchemaDriftWarnings: vi.fn(),
}));

vi.mock("@/lib/config/admin-store", () => adminStoreMock);
vi.mock("@/lib/config/store", () => storeMock);
vi.mock("@/lib/smartsheet", () => smartsheetMock);
vi.mock("@/lib/public-view", () => publicViewMock);

import {
  AdminActionError,
  deleteAdminSource,
  deleteAdminView,
  saveAdminViewConfig,
  updateAdminViewPublication,
} from "@/lib/admin-management";

const sourceConfig: SourceConfig = {
  id: "grad-programs",
  label: "GRAD Programs",
  sourceType: "sheet",
  smartsheetId: 7763577444192132,
};

const sourceConfigTwo: SourceConfig = {
  id: "other-programs",
  label: "Other Programs",
  sourceType: "sheet",
  smartsheetId: 1111111111111111,
};

const viewConfig: ViewConfig = {
  id: "faculty",
  slug: "grad-programs",
  sourceId: "grad-programs",
  label: "Faculty",
  layout: "table",
  public: true,
  fields: [
    {
      key: "programName",
      label: "Program Name",
      source: { columnTitle: "Program Name" },
      render: { type: "text" },
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
  adminStoreMock.saveViewConfig.mockReset();
  adminStoreMock.updateViewPublication.mockReset();
  adminStoreMock.deleteSourceConfig.mockReset();
  adminStoreMock.deleteViewConfig.mockReset();
  storeMock.getSourceConfigById.mockReset();
  storeMock.getViewConfigById.mockReset();
  storeMock.listViewConfigs.mockReset();
  smartsheetMock.getSmartsheetSchema.mockReset();
  publicViewMock.collectSchemaDriftWarnings.mockReset();
});

describe("admin management", () => {
  it("saves draft views without a publish gate", async () => {
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    smartsheetMock.getSmartsheetSchema.mockResolvedValue({ columns: [] });

    await saveAdminViewConfig({ ...viewConfig, public: false });

    expect(adminStoreMock.saveViewConfig).toHaveBeenCalledWith(expect.objectContaining({ id: "faculty", public: false }));
    expect(smartsheetMock.getSmartsheetSchema).toHaveBeenCalled();
  });

  it("blocks creating a new view when the id already exists", async () => {
    storeMock.getViewConfigById.mockResolvedValue(viewConfig);

    await expect(saveAdminViewConfig({ ...viewConfig, public: false }, { rejectOnExistingId: true })).rejects.toMatchObject({
      status: 409,
      errors: [expect.stringContaining('View ID "faculty"')],
    } satisfies Partial<AdminActionError>);

    expect(adminStoreMock.saveViewConfig).not.toHaveBeenCalled();
  });

  it("blocks saving a published view when schema drift warnings exist", async () => {
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    smartsheetMock.getSmartsheetSchema.mockResolvedValue({ columns: [] });
    publicViewMock.collectSchemaDriftWarnings.mockReturnValue(["field \"programName\" does not match any current column in the source schema"]);

    await expect(saveAdminViewConfig(viewConfig)).rejects.toMatchObject({
      status: 409,
      warnings: [expect.stringContaining("programName")],
    } satisfies Partial<AdminActionError>);
    expect(adminStoreMock.saveViewConfig).not.toHaveBeenCalled();
  });

  it("blocks saving a published view when another source already uses that slug", async () => {
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    smartsheetMock.getSmartsheetSchema.mockResolvedValue({ columns: [] });
    publicViewMock.collectSchemaDriftWarnings.mockReturnValue([]);
    storeMock.listViewConfigs.mockResolvedValue([
      {
        ...viewConfig,
        id: "other-source-view",
        sourceId: sourceConfigTwo.id,
        slug: "shared-page",
        label: "Other Source View",
      },
    ]);

    await expect(
      saveAdminViewConfig({ ...viewConfig, slug: "shared-page", public: true }),
    ).rejects.toMatchObject({
      status: 409,
      errors: [expect.stringContaining("Published slugs may only belong to one source")],
    } satisfies Partial<AdminActionError>);

    expect(adminStoreMock.saveViewConfig).not.toHaveBeenCalled();
  });

  it("uses a fresh schema fetch before publishing", async () => {
    storeMock.getViewConfigById.mockResolvedValue(viewConfig);
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    storeMock.listViewConfigs.mockResolvedValue([viewConfig]);
    smartsheetMock.getSmartsheetSchema.mockResolvedValue({ columns: [] });
    publicViewMock.collectSchemaDriftWarnings.mockReturnValue([]);
    adminStoreMock.updateViewPublication.mockResolvedValue({ ...viewConfig, public: true });

    await updateAdminViewPublication("faculty", true);

    expect(smartsheetMock.getSmartsheetSchema).toHaveBeenCalledWith(sourceConfig, { fresh: true });
    expect(publicViewMock.collectSchemaDriftWarnings).toHaveBeenCalledWith(viewConfig, [], sourceConfig);
    expect(adminStoreMock.updateViewPublication).toHaveBeenCalledWith("faculty", true);
  });

  it("blocks publishing when another source already uses that slug", async () => {
    const conflictingView: ViewConfig = {
      ...viewConfig,
      id: "other-source-view",
      sourceId: sourceConfigTwo.id,
      slug: viewConfig.slug,
      label: "Other Source View",
      public: true,
    };

    storeMock.getViewConfigById.mockResolvedValue(viewConfig);
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    storeMock.listViewConfigs.mockResolvedValue([viewConfig, conflictingView]);
    smartsheetMock.getSmartsheetSchema.mockResolvedValue({ columns: [] });
    publicViewMock.collectSchemaDriftWarnings.mockReturnValue([]);

    await expect(updateAdminViewPublication("faculty", true)).rejects.toMatchObject({
      status: 409,
      errors: [expect.stringContaining("Published slugs may only belong to one source")],
    } satisfies Partial<AdminActionError>);

    expect(adminStoreMock.updateViewPublication).not.toHaveBeenCalled();
  });

  it("blocks deleting a source while views still reference it", async () => {
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    storeMock.listViewConfigs.mockResolvedValue([viewConfig]);

    await expect(deleteAdminSource("grad-programs")).rejects.toMatchObject({
      status: 409,
      errors: [expect.stringContaining("Faculty")],
    } satisfies Partial<AdminActionError>);
    expect(adminStoreMock.deleteSourceConfig).not.toHaveBeenCalled();
  });

  it("deletes existing views", async () => {
    storeMock.getViewConfigById.mockResolvedValue(viewConfig);

    await deleteAdminView("faculty");

    expect(adminStoreMock.deleteViewConfig).toHaveBeenCalledWith("faculty");
  });

  it("saves only the edited view when slug changes (siblings are not auto-rewritten)", async () => {
    const tabA: ViewConfig = { ...viewConfig, id: "tab-a", slug: "page-x", label: "Tab A" };
    const tabB: ViewConfig = { ...viewConfig, id: "tab-b", slug: "page-x", label: "Tab B", tabOrder: 2 };
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    smartsheetMock.getSmartsheetSchema.mockResolvedValue({ columns: [] });
    publicViewMock.collectSchemaDriftWarnings.mockReturnValue([]);

    storeMock.getViewConfigById.mockImplementation(async (id: string) => {
      if (id === "tab-a") {
        return tabA;
      }
      if (id === "tab-b") {
        return tabB;
      }
      return null;
    });
    storeMock.listViewConfigs.mockResolvedValue([tabA, tabB]);

    await saveAdminViewConfig({ ...tabA, slug: "page-y" });

    expect(adminStoreMock.saveViewConfig).toHaveBeenCalledTimes(1);
    expect(adminStoreMock.saveViewConfig).toHaveBeenCalledWith(expect.objectContaining({ id: "tab-a", slug: "page-y" }));
  });
});
