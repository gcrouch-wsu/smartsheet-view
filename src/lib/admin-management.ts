import {
  deleteSourceConfig,
  deleteViewConfig,
  saveViewConfig,
  updateViewPublication,
} from "@/lib/config/admin-store";
import { useConfigDatabase } from "@/lib/config/config-db";
import { getSourceConfigById, getViewConfigById, listViewConfigs } from "@/lib/config/store";

function ensureUniqueSlug(existingSlugs: Set<string>, baseSlug: string): string {
  let slug = baseSlug;
  let n = 2;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}_${n}`;
    n++;
  }
  return slug;
}
import type { ViewConfig } from "@/lib/config/types";
import { getContributorEditingValidationErrors } from "@/lib/contributor-utils";
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

async function validateContributorEditing(view: ViewConfig) {
  if (!view.editing?.enabled) {
    return;
  }

  if (!useConfigDatabase()) {
    throw new AdminActionError({
      status: 400,
      message: "Contributor editing requires DATABASE_URL-backed storage.",
    });
  }

  const source = await getSourceForView(view);
  const schema = await getSmartsheetSchema(source, { fresh: true });
  const errors = getContributorEditingValidationErrors(view, schema.columns);

  if (errors.length > 0) {
    throw new AdminActionError({
      status: 400,
      message: "Contributor editing configuration is invalid for the current source schema.",
      errors,
    });
  }
}

export async function saveAdminViewConfig(view: ViewConfig) {
  await validateContributorEditing(view);

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

  await validateContributorEditing(view);

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

export async function duplicateAdminView(sourceViewId: string) {
  const source = await getViewConfigById(sourceViewId);
  if (!source) {
    throw new AdminActionError({
      status: 404,
      message: `View "${sourceViewId}" was not found.`,
    });
  }

  const existingViews = await listViewConfigs();
  const existingSlugs = new Set(existingViews.map((v) => v.slug));

  const slugPrefix = source.slug.startsWith("draft_") ? "" : "draft_";
  const baseSlug = `${slugPrefix}${source.slug}`;
  const newId = `${source.id}-copy-${Date.now()}`;
  const uniqueSlug = ensureUniqueSlug(existingSlugs, baseSlug);

  const duplicate: ViewConfig = {
    ...source,
    id: newId,
    slug: uniqueSlug,
    public: false,
    fields: source.fields.map((f) => ({
      ...f,
      source: { ...f.source },
      transforms: f.transforms?.map((t) => ({ ...t })) ?? [],
      render: { ...f.render },
    })),
  };

  await saveViewConfig(duplicate);
  return duplicate;
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
