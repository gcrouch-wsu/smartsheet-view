import type { LayoutType } from "@/lib/config/types";

export type PublicInteractiveHrefOptions = {
  layout?: LayoutType;
  embed?: boolean;
};

/**
 * /view/{slug} for the interactive page. Omits ?view= when there is exactly one published view on that slug.
 */
export function publicInteractiveHref(
  slug: string,
  viewId: string,
  singlePublishedView: boolean,
  options?: PublicInteractiveHrefOptions,
): string {
  const params = new URLSearchParams();
  if (!singlePublishedView) {
    params.set("view", viewId);
  }
  if (options?.layout) {
    params.set("layout", options.layout);
  }
  if (options?.embed) {
    params.set("embed", "1");
  }
  const q = params.toString();
  return q ? `/view/${slug}?${q}` : `/view/${slug}`;
}

/** /view/{slug}/print */
export function publicPrintHref(slug: string, viewId: string, singlePublishedView: boolean): string {
  const base = `/view/${slug}/print`;
  if (singlePublishedView) {
    return base;
  }
  return `${base}?view=${encodeURIComponent(viewId)}`;
}

/** /view/{slug}/contributor/login */
export function publicContributorLoginHref(slug: string, viewId: string, singlePublishedView: boolean): string {
  const base = `/view/${slug}/contributor/login`;
  if (singlePublishedView) {
    return base;
  }
  return `${base}?view=${encodeURIComponent(viewId)}`;
}
