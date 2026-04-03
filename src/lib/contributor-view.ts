import type { SmartsheetDataset, SourceConfig, ViewConfig } from "@/lib/config/types";
import { loadPublicViewCollection, resolveRequestedViewConfig } from "@/lib/public-view";
import { getSmartsheetDataset, type FetchBehaviorOptions } from "@/lib/smartsheet";

export interface ContributorViewContext {
  slug: string;
  title: string;
  sourceConfig: SourceConfig;
  viewConfigs: ViewConfig[];
  defaultViewId: string;
  activeView: ViewConfig;
}

export const CONTRIBUTOR_DATASET_OPTIONS: FetchBehaviorOptions = {
  fresh: true,
  fetchOptionsOverride: {
    includeObjectValue: true,
    /** Required for contributor picklist dropdowns; sources may disable this on their default fetch. */
    includeColumnOptions: true,
  },
};

export async function loadContributorViewContext(slug: string, requestedViewId?: string | null) {
  const collection = await loadPublicViewCollection(slug);
  if (!collection) {
    return null;
  }

  const activeView = resolveRequestedViewConfig(collection.viewConfigs, requestedViewId);
  if (!activeView) {
    return null;
  }

  return {
    ...collection,
    activeView,
  } satisfies ContributorViewContext;
}

export async function loadContributorDataset(
  sourceConfig: SourceConfig,
  options: FetchBehaviorOptions = CONTRIBUTOR_DATASET_OPTIONS,
): Promise<SmartsheetDataset> {
  return getSmartsheetDataset(sourceConfig, options);
}
