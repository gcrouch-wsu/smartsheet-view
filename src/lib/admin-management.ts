import {
  deleteSourceConfig,
  deleteViewConfig,
  saveViewConfig,
  updateViewPublication,
} from "@/lib/config/admin-store";
import { getSourceConfigById, getViewConfigById, listViewConfigs } from "@/lib/config/store";
import type { ViewConfig } from "@/lib/config/types";
import { collectSchemaDriftWarnings } from "@/lib/public-view";
import { getSmartsheetSchema } from "@/lib/smartsheet";

export class AdminActionError extends Error {
  status: number;
  errors?: string[];
  warnings?: string[];

  constructor(options: { status: number; message: string; errors?: string[]; warnings?: string[] }) {
    super(options.message);
    this.name = "AdminActionError";
    this.status = options.status;
    this.errors = options.errors;
    this.warnings = options.warnings;
  }
}

async function getSourceForView(view: ViewConfig) {
  const source = await getSourceConfigById(view.sourceId);
  if (!source) {
    throw new AdminActionError({
      status: 404,
      message: `Source \"${view.sourceId}\" was not found.`,
    });
  }

  return source;
}

export async function getPublicationWarnings(view: ViewConfig) {
  const source = await getSourceForView(view);
  const schema = await getSmartsheetSchema(source, { fresh: true });
  return collectSchemaDriftWarnings(view, schema.columns);
}

export async function saveAdminViewConfig(view: ViewConfig) {
  if (view.public) {
    const warnings = await getPublicationWarnings(view);
    if (warnings.length > 0) {
      throw new AdminActionError({
        status: 409,
        message: "View could not be saved as published because the current source schema no longer matches the config.",
        warnings,
      });
    }
  }

  await saveViewConfig(view);
  return view;
}

export async function updateAdminViewPublication(viewId: string, isPublic: boolean) {
  if (!isPublic) {
    return updateViewPublication(viewId, false);
  }

  const view = await getViewConfigById(viewId);
  if (!view) {
    throw new AdminActionError({
      status: 404,
      message: `View \"${viewId}\" was not found.`,
    });
  }

  const warnings = await getPublicationWarnings(view);
  if (warnings.length > 0) {
    throw new AdminActionError({
      status: 409,
      message: "View could not be published because the current source schema no longer matches the config.",
      warnings,
    });
  }

  return updateViewPublication(viewId, true);
}

export async function deleteAdminView(viewId: string) {
  const existing = await getViewConfigById(viewId);
  if (!existing) {
    throw new AdminActionError({
      status: 404,
      message: `View \"${viewId}\" was not found.`,
    });
  }

  await deleteViewConfig(viewId);
}

export async function deleteAdminSource(sourceId: string) {
  const source = await getSourceConfigById(sourceId);
  if (!source) {
    throw new AdminActionError({
      status: 404,
      message: `Source \"${sourceId}\" was not found.`,
    });
  }

  const attachedViews = (await listViewConfigs())
    .filter((view) => view.sourceId === sourceId)
    .map((view) => view.label || view.id);

  if (attachedViews.length > 0) {
    throw new AdminActionError({
      status: 409,
      message: "Source could not be deleted because one or more views still reference it.",
      errors: [
        `Remove or reassign these views first: ${attachedViews.join(", ")}.`,
      ],
    });
  }

  await deleteSourceConfig(sourceId);
}