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
    await saveAdminViewConfig({ ...viewConfig, public: false });

    expect(adminStoreMock.saveViewConfig).toHaveBeenCalledWith(expect.objectContaining({ id: "faculty", public: false }));
    expect(smartsheetMock.getSmartsheetSchema).not.toHaveBeenCalled();
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

  it("uses a fresh schema fetch before publishing", async () => {
    storeMock.getViewConfigById.mockResolvedValue(viewConfig);
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    smartsheetMock.getSmartsheetSchema.mockResolvedValue({ columns: [] });
    publicViewMock.collectSchemaDriftWarnings.mockReturnValue([]);
    adminStoreMock.updateViewPublication.mockResolvedValue({ ...viewConfig, public: true });

    await updateAdminViewPublication("faculty", true);

    expect(smartsheetMock.getSmartsheetSchema).toHaveBeenCalledWith(sourceConfig, { fresh: true });
    expect(publicViewMock.collectSchemaDriftWarnings).toHaveBeenCalledWith(viewConfig, [], sourceConfig);
    expect(adminStoreMock.updateViewPublication).toHaveBeenCalledWith("faculty", true);
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
});
