/** Canonical slug comparison for public URLs and publish-time conflict checks. */
export function normalizePublishedSlug(slug: string): string {
  return slug.trim().toLowerCase();
}
