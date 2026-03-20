import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { ToastProvider } from "@/components/admin/Toast";
import { EmbedHeightReporter } from "@/components/public/EmbedHeightReporter";
import { PublicHeaderBrandStrip } from "@/components/public/PublicHeaderBrandStrip";
import { ViewStyleWrapper } from "@/components/public/ViewStyleWrapper";
import { ViewWithSearchAndIndex } from "@/components/public/ViewWithSearchAndIndex";
import { formatLayoutLabel } from "@/components/public/ViewRenderer";
import { ViewTabs } from "@/components/public/ViewTabs";
import { LAYOUT_OPTIONS } from "@/lib/config/options";
import type { LayoutType } from "@/lib/config/types";
import { mergeThemeTokens } from "@/lib/config/themes";
import {
  CONTRIBUTOR_SESSION_COOKIE_NAME,
  getContributorConfigurationError,
  readContributorSessionToken,
} from "@/lib/contributor-auth";
import {
  buildContributorEditingClientConfig,
  getEditableRowIdsForView,
  isContributorStillInSheet,
} from "@/lib/contributor-utils";
import { CONTRIBUTOR_DATASET_OPTIONS, loadContributorDataset } from "@/lib/contributor-view";
import {
  loadPublicPageState,
  resolveRequestedResolvedView,
  resolveRequestedViewConfig,
} from "@/lib/public-view";
import { isHtmlContent, parseFormattedHeaderText, renderHeaderCustomText } from "@/lib/rendering";

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

  let page;
  try {
    page = await loadPublicPageState(slug);
  } catch (error) {
    console.error(`[smartsheets_view] Failed to load public page "${slug}":`, error);
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--wsu-stone)] px-4 text-center">
        <div className="max-w-md space-y-4 rounded-3xl border border-[color:var(--wsu-border)] bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-[color:var(--wsu-crimson)]">Application Error</h1>
          <p className="text-sm text-[color:var(--wsu-muted)]">
            We encountered a problem loading this data view. This usually happens if the Smartsheet source is unavailable or the configuration is incomplete.
          </p>
          <div className="max-h-32 overflow-auto rounded bg-gray-50 p-2 text-left font-mono text-[10px]">
            {error instanceof Error ? error.message : String(error)}
          </div>
          <Link
            href="/"
            className="btn-crimson inline-block rounded-full bg-[color:var(--wsu-crimson)] px-6 py-2 text-sm font-medium"
          >
            Return home
          </Link>
        </div>
      </main>
    );
  }

  if (!page) {
    notFound();
  }

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  const requestedView = firstValue(resolvedSearchParams.view);
  const requestedLayout = firstValue(resolvedSearchParams.layout);
  const embed = firstValue(resolvedSearchParams.embed) === "1";
  const activeView = resolveRequestedResolvedView(page.resolvedViews, page.defaultViewId, requestedView);
  const activeViewConfig = resolveRequestedViewConfig(page.viewConfigs, requestedView);

  if (!activeView || !activeViewConfig) {
    notFound();
  }

  const layout =
    activeView.fixedLayout
      ? activeView.layout
      : LAYOUT_OPTIONS.includes(requestedLayout as LayoutType)
        ? (requestedLayout as LayoutType)
        : activeView.layout;

  const mainClassName = embed ? "bg-transparent px-0 py-0" : "min-h-screen px-4 py-6 sm:px-6 lg:px-8";
  const containerClassName = embed ? "mx-auto max-w-none space-y-4" : "mx-auto max-w-7xl space-y-6";
  const tokens = mergeThemeTokens(activeView.themePresetId ?? "wsu_crimson", activeView.style);
  const mainStyle = !embed && tokens.backgroundColor ? { backgroundColor: tokens.backgroundColor } : undefined;

  const contributorConfigurationError = getContributorConfigurationError();
  const editingEnabled = activeViewConfig.editing?.enabled && !contributorConfigurationError;
  const showContributorLoginLink = editingEnabled && activeViewConfig.editing?.showLoginLink !== false;
  const loginHref = showContributorLoginLink ? `/view/${slug}/contributor/login?view=${activeView.id}` : null;
  const showContributorInstructions =
    editingEnabled && activeViewConfig.editing?.showContributorInstructions !== false;

  let contributorEmail: string | null = null;
  let editingConfig = null;
  let editableRowIds: number[] = [];

  if (editingEnabled) {
    const cookieStore = await cookies();
    const session = await readContributorSessionToken(cookieStore.get(CONTRIBUTOR_SESSION_COOKIE_NAME)?.value);

    if (session.ok && session.payload) {
      const dataset = await loadContributorDataset(page.sourceConfig, CONTRIBUTOR_DATASET_OPTIONS);
      if (isContributorStillInSheet(dataset.rows, session.payload.email, activeViewConfig.editing!.contactColumnIds)) {
        contributorEmail = session.payload.email;
        editingConfig = buildContributorEditingClientConfig(activeViewConfig, dataset.columns);
        editableRowIds = getEditableRowIdsForView(dataset.rows, activeViewConfig, contributorEmail);
      }
    }
  }

  /** Signed-in contributors only see rows they are allowed to edit (no scrolling through everyone). */
  let viewForDisplay = activeView;
  if (contributorEmail && editableRowIds.length > 0) {
    const editableSet = new Set(editableRowIds);
    const rows = activeView.rows.filter((row) => editableSet.has(row.id));
    viewForDisplay = { ...activeView, rows, rowCount: rows.length };
  }

  return (
    <main className={mainClassName} style={mainStyle}>
      {!embed && (
        <a
          href="#main-view-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:border focus:border-[color:var(--wsu-border)] focus:bg-[color:var(--wsu-paper)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[color:var(--wsu-crimson)] focus:shadow-lg"
        >
          Skip to main content
        </a>
      )}
      {embed && <EmbedHeightReporter />}
      <div className={containerClassName}>
        <ViewStyleWrapper style={activeView.style} themePresetId={activeView.themePresetId}>
          {!embed && !activeView.presentation?.hideHeader && (
            <header className="rounded-[2rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] px-6 py-6 shadow-[0_24px_64px_rgba(35,31,32,0.07)] sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0 flex-1 space-y-3">
                  <PublicHeaderBrandStrip presentation={activeView.presentation} />
                  {!activeView.presentation?.hideHeaderBackLink &&
                    (contributorEmail ? (
                      <p className="text-sm text-[color:var(--wsu-muted)]">
                        <Link href="/" className="font-medium text-[color:var(--wsu-crimson)] hover:underline">
                          Published views home
                        </Link>
                        <span className="mt-1 block text-xs text-[color:var(--wsu-muted)]">
                          Use <strong className="font-medium text-[color:var(--wsu-ink)]">Sign out</strong> below to
                          change accounts. Browser Back may go to other sites you opened earlier—use this link to stay
                          in public views.
                        </span>
                      </p>
                    ) : (
                      <Link href="/" className="text-sm font-medium text-[color:var(--wsu-muted)] hover:text-[color:var(--wsu-crimson)]">
                        Back to configured pages
                      </Link>
                    ))}
                  <div>
                    {!activeView.presentation?.hideHeaderSourceLabel && (
                      <p className="font-view-heading text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">
                        {page.sourceConfig.label}
                      </p>
                    )}
                    {!activeView.presentation?.hideHeaderPageTitle && (
                      <h1 className="font-view-heading mt-2 text-3xl font-semibold tracking-tight text-[color:var(--wsu-ink)] sm:text-4xl">
                        {page.title}
                      </h1>
                    )}
                    {!activeView.presentation?.hideHeaderLiveDataText && (
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--wsu-muted)]">
                        Live data from <span className="font-medium text-[color:var(--wsu-ink)]">{page.sourceName}</span>.
                      </p>
                    )}
                  </div>
                  {activeView.presentation?.headerCustomText &&
                    (isHtmlContent(activeView.presentation.headerCustomText) ? (
                      <div
                        className="custom-header-text mt-3 text-sm leading-6 text-[color:var(--wsu-ink)] [&_a]:relative [&_a]:z-[1] [&_a]:cursor-pointer [&_a]:text-[color:var(--wsu-crimson)] [&_a]:underline [&_a]:hover:text-[color:var(--wsu-crimson-dark)]"
                        dangerouslySetInnerHTML={{
                          __html: renderHeaderCustomText(
                            activeView.presentation.headerCustomText,
                            `${baseUrl}/view/${slug}?view=${activeView.id}`,
                          ),
                        }}
                      />
                    ) : (
                      <div className="custom-header-text mt-3 text-sm leading-6 text-[color:var(--wsu-ink)]">
                        {activeView.presentation.headerCustomText.split("\n").map((line, i) => (
                          <p key={i} className="whitespace-pre-wrap">
                            {parseFormattedHeaderText(line, `${baseUrl}/view/${slug}?view=${activeView.id}`).map((part, j) =>
                              typeof part === "string" ? (
                                <span key={j}>{part}</span>
                              ) : part.t === "b" ? (
                                <strong key={j}>{part.c}</strong>
                              ) : part.t === "i" ? (
                                <em key={j}>{part.c}</em>
                              ) : (
                                <a
                                  key={j}
                                  href={part.c}
                                  className="relative z-[1] cursor-pointer text-[color:var(--wsu-crimson)] underline hover:text-[color:var(--wsu-crimson-dark)]"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {part.c}
                                </a>
                              ),
                            )}
                          </p>
                        ))}
                      </div>
                    ))}
                </div>
                {(loginHref && !contributorEmail && activeView.presentation?.hideHeaderInfoBox && (
                  <div className="shrink-0">
                    <div className="rounded-[1.5rem] border border-[color:var(--wsu-border)] bg-white px-4 py-4">
                      <Link
                        href={loginHref}
                        className="text-sm font-semibold text-[color:var(--wsu-crimson)] hover:underline"
                      >
                        Contributor sign in
                      </Link>
                    </div>
                  </div>
                )) ||
                (!activeView.presentation?.hideHeaderInfoBox &&
                  (!activeView.presentation?.hideHeaderActiveView ||
                    !activeView.presentation?.hideHeaderRows ||
                    !activeView.presentation?.hideHeaderRefreshed ||
                    (loginHref && !contributorEmail)) && (
                    <div className="shrink-0">
                      <div className="rounded-[1.5rem] border border-[color:var(--wsu-border)] bg-white px-4 py-4 text-sm text-[color:var(--wsu-muted)]">
                        {!activeView.presentation?.hideHeaderActiveView && (
                          <p>
                            <span className="font-view-heading font-semibold text-[color:var(--wsu-ink)]">Active view:</span> {activeView.label}
                          </p>
                        )}
                        {!activeView.presentation?.hideHeaderRows && (
                          <p className={!activeView.presentation?.hideHeaderActiveView ? "mt-2" : ""}>
                            <span className="font-semibold text-[color:var(--wsu-ink)]">Rows:</span>{" "}
                            {contributorEmail && editableRowIds.length > 0 ? (
                              <>
                                {viewForDisplay.rowCount} assigned to you
                                <span className="text-[color:var(--wsu-muted)]"> ({activeView.rowCount} in this view)</span>
                              </>
                            ) : (
                              activeView.rowCount
                            )}
                          </p>
                        )}
                        {!activeView.presentation?.hideHeaderRefreshed && (
                          <p
                            className={
                              !activeView.presentation?.hideHeaderActiveView || !activeView.presentation?.hideHeaderRows
                                ? "mt-2"
                                : ""
                            }
                          >
                            <span className="font-view-heading font-semibold text-[color:var(--wsu-ink)]">Refreshed:</span>{" "}
                            {formatTimestamp(page.fetchedAt)}
                          </p>
                        )}
                        {loginHref && !contributorEmail && (
                          <p
                            className={
                              !activeView.presentation?.hideHeaderActiveView ||
                              !activeView.presentation?.hideHeaderRows ||
                              !activeView.presentation?.hideHeaderRefreshed
                                ? "mt-2"
                                : ""
                            }
                          >
                            <Link
                              href={loginHref}
                              className="font-view-heading font-semibold text-[color:var(--wsu-crimson)] hover:underline"
                            >
                              Contributor sign in
                            </Link>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </header>
          )}

          <section id="main-view-content" className={embed ? "space-y-3 scroll-mt-4" : "space-y-4 scroll-mt-4"}>
            {!activeView.presentation?.hideViewTabs && (
              <ViewTabs
                slug={slug}
                views={page.resolvedViews.map((view) => ({
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
              <div>
                {!activeView.presentation?.hideViewTitleSection && (
                  <>
                    <h2 className="font-view-heading text-2xl font-semibold text-[color:var(--wsu-ink)]">{activeView.label}</h2>
                    {activeView.description && (
                      <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">{activeView.description}</p>
                    )}
                  </>
                )}
                {loginHref && !contributorEmail && !embed && activeView.presentation?.hideHeader && (
                  <div className={!activeView.presentation?.hideViewTitleSection ? "mt-3" : ""}>
                    <Link
                      href={loginHref}
                      className="inline-flex rounded-full border border-[color:var(--wsu-crimson)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-crimson)] hover:bg-[color:var(--wsu-crimson)] hover:text-white"
                    >
                      Contributor sign in
                    </Link>
                  </div>
                )}
              </div>
              {!activeView.fixedLayout && (
                <nav aria-label="Layout" className="flex flex-wrap gap-2">
                  {LAYOUT_OPTIONS.map((option) => {
                    const active = option === layout;
                    return (
                      <Link
                        key={option}
                        href={buildHref(slug, activeView.id, option, embed)}
                        aria-current={active ? "page" : undefined}
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
                </nav>
              )}
            </div>

            {showContributorInstructions && (
              <p className={embed ? "text-xs text-[color:var(--wsu-muted)]" : "text-sm text-[color:var(--wsu-muted)]"}>
                <a
                  href="/instructions/contributor"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Opens in a new window"
                  className="font-medium text-[color:var(--wsu-crimson)] underline underline-offset-2 hover:no-underline"
                >
                  Contributor instructions
                </a>
                {!embed && <span className="text-[color:var(--wsu-muted)]"> (opens in a new window)</span>}
              </p>
            )}

            <ToastProvider>
              <ViewWithSearchAndIndex
                view={viewForDisplay}
                layout={layout}
                embed={embed}
                slug={slug}
                viewId={activeView.id}
                contributorEmail={contributorEmail}
                editingConfig={editingConfig}
                editableRowIds={editableRowIds}
                contributorRowsFiltered={Boolean(contributorEmail && editableRowIds.length > 0)}
              />
            </ToastProvider>
          </section>
        </ViewStyleWrapper>
      </div>
    </main>
  );
}
