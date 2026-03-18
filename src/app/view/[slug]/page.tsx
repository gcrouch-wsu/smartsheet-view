import Link from "next/link";
import { EmbedHeightReporter } from "@/components/public/EmbedHeightReporter";
import { ViewStyleWrapper } from "@/components/public/ViewStyleWrapper";
import { ViewWithSearchAndIndex } from "@/components/public/ViewWithSearchAndIndex";
import { formatLayoutLabel } from "@/components/public/ViewRenderer";
import { ViewTabs } from "@/components/public/ViewTabs";
import { LAYOUT_OPTIONS } from "@/lib/config/options";
import type { LayoutType } from "@/lib/config/types";
import { mergeThemeTokens } from "@/lib/config/themes";
import { loadPublicPage } from "@/lib/public-view";
import { notFound } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(slug: string, viewId: string, layout: LayoutType, embed: boolean) {
  const params = new URLSearchParams();
  params.set("view", viewId);
  params.set("layout", layout);
  if (embed) {
    params.set("embed", "1");
  }
  return `/view/${slug}?${params.toString()}`;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PublicViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const page = await loadPublicPage(slug);

  if (!page) {
    notFound();
  }

  const requestedView = firstValue(resolvedSearchParams.view);
  const requestedLayout = firstValue(resolvedSearchParams.layout);
  const embed = firstValue(resolvedSearchParams.embed) === "1";
  const activeView =
    page.views.find((view) => view.id === requestedView) ??
    page.views.find((view) => view.id === page.defaultViewId) ??
    page.views[0];

  if (!activeView) {
    notFound();
  }

  const layout =
    activeView.fixedLayout
      ? activeView.layout
      : LAYOUT_OPTIONS.includes(requestedLayout as LayoutType)
        ? (requestedLayout as LayoutType)
        : activeView.layout;

  const mainClassName = embed
    ? "bg-transparent px-0 py-0"
    : "min-h-screen px-4 py-6 sm:px-6 lg:px-8";
  const containerClassName = embed ? "mx-auto max-w-none space-y-4" : "mx-auto max-w-7xl space-y-6";

  const tokens = mergeThemeTokens(activeView.themePresetId ?? "wsu_crimson", activeView.style);
  const mainStyle = !embed && tokens.backgroundColor ? { backgroundColor: tokens.backgroundColor } : undefined;

  return (
    <main className={mainClassName} style={mainStyle}>
      {embed && <EmbedHeightReporter />}
      <div className={containerClassName}>
        <ViewStyleWrapper style={activeView.style} themePresetId={activeView.themePresetId}>
        {!embed && (
          <header className="rounded-[2rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] px-6 py-6 shadow-[0_24px_64px_rgba(35,31,32,0.07)] sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-3">
                {!activeView.presentation?.hideHeaderBackLink && (
                  <Link href="/" className="text-sm font-medium text-[color:var(--wsu-muted)] hover:text-[color:var(--wsu-crimson)]">
                    Back to configured pages
                  </Link>
                )}
                <div>
                  {!activeView.presentation?.hideHeaderSourceLabel && (
                    <p className="font-view-heading text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">
                      {page.source.label}
                    </p>
                  )}
                  {!activeView.presentation?.hideHeaderPageTitle && (
                    <h1 className="font-view-heading mt-2 text-3xl font-semibold tracking-tight text-[color:var(--wsu-ink)] sm:text-4xl">
                      {page.title}
                    </h1>
                  )}
                  {!activeView.presentation?.hideHeaderLiveDataText && (
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--wsu-muted)]">
                      Live data from <span className="font-medium text-[color:var(--wsu-ink)]">{page.source.name}</span>.
                    </p>
                  )}
                </div>
              </div>
              {!activeView.presentation?.hideHeaderInfoBox &&
                (activeView.presentation?.headerCustomText ||
                  !(activeView.presentation?.hideHeaderActiveView ?? false) ||
                  !(activeView.presentation?.hideHeaderRows ?? false) ||
                  !(activeView.presentation?.hideHeaderRefreshed ?? false)) && (
                <div className="rounded-[1.5rem] border border-[color:var(--wsu-border)] bg-white px-4 py-4 text-sm text-[color:var(--wsu-muted)]">
                  {activeView.presentation?.headerCustomText ? (
                    <p className="whitespace-pre-wrap">{activeView.presentation.headerCustomText}</p>
                  ) : (
                    <>
                      {!activeView.presentation?.hideHeaderActiveView && (
                        <p>
                          <span className="font-view-heading font-semibold text-[color:var(--wsu-ink)]">Active view:</span> {activeView.label}
                        </p>
                      )}
                      {!activeView.presentation?.hideHeaderRows && (
                        <p className={!activeView.presentation?.hideHeaderActiveView ? "mt-2" : ""}>
                          <span className="font-semibold text-[color:var(--wsu-ink)]">Rows:</span> {activeView.rowCount}
                        </p>
                      )}
                      {!activeView.presentation?.hideHeaderRefreshed && (
                        <p className={!activeView.presentation?.hideHeaderActiveView || !activeView.presentation?.hideHeaderRows ? "mt-2" : ""}>
                          <span className="font-view-heading font-semibold text-[color:var(--wsu-ink)]">Refreshed:</span> {formatTimestamp(page.fetchedAt)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </header>
        )}

        <section className={embed ? "space-y-3" : "space-y-4"}>
          {!activeView.presentation?.hideViewTabs && (
            <ViewTabs
              slug={slug}
              views={page.views.map((view) => ({
                id: view.id,
                label: view.presentation?.viewTabLabel ?? view.label,
                rowCount: view.rowCount,
                hideCount: view.presentation?.hideViewTabCount,
              }))}
              activeViewId={activeView.id}
              layout={layout}
              embed={embed}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {!activeView.presentation?.hideViewTitleSection && (
              <div>
                <h2 className="font-view-heading text-2xl font-semibold text-[color:var(--wsu-ink)]">{activeView.label}</h2>
                {activeView.description && (
                  <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">{activeView.description}</p>
                )}
              </div>
            )}
            {!activeView.fixedLayout && (
              <div className="flex flex-wrap gap-2">
                {LAYOUT_OPTIONS.map((option) => {
                  const active = option === layout;
                  return (
                    <Link
                      key={option}
                      href={buildHref(slug, activeView.id, option, embed)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        active
                          ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] text-white"
                          : "border-[color:var(--wsu-border)] bg-white text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
                      }`}
                    >
                      {formatLayoutLabel(option)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <ViewWithSearchAndIndex view={activeView} layout={layout} embed={embed} />
        </section>
        </ViewStyleWrapper>
      </div>
    </main>
  );
}
