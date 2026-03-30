"use client";

import Link from "next/link";
import { useState } from "react";

type AdminGuideTabId = "overview" | "sources" | "setup" | "fields" | "editing" | "publish";

type AdminGuideTab = {
  id: AdminGuideTabId;
  label: string;
};

const TABS: AdminGuideTab[] = [
  { id: "overview", label: "Overview" },
  { id: "sources", label: "Sources" },
  { id: "setup", label: "Setup & Layout" },
  { id: "fields", label: "Fields & Display" },
  { id: "editing", label: "Editing & Groups" },
  { id: "publish", label: "Preview & Publish" },
];

function TabButton({
  id,
  label,
  activeTab,
  onSelect,
}: {
  id: AdminGuideTabId;
  label: string;
  activeTab: AdminGuideTabId;
  onSelect: (next: AdminGuideTabId) => void;
}) {
  const active = activeTab === id;
  return (
    <button
      id={`admin-guide-tab-${id}`}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`admin-guide-panel-${id}`}
      onClick={() => onSelect(id)}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] text-white"
          : "border-[color:var(--wsu-border)] bg-white text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
      }`}
    >
      {label}
    </button>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">{description}</p> : null}
    </div>
  );
}

export function AdminGuideTabs() {
  const [activeTab, setActiveTab] = useState<AdminGuideTabId>("overview");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/10 p-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Admin guide sections">
          {TABS.map((tab) => (
            <TabButton key={tab.id} id={tab.id} label={tab.label} activeTab={activeTab} onSelect={setActiveTab} />
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <section id="admin-guide-panel-overview" role="tabpanel" aria-labelledby="admin-guide-tab-overview" className="space-y-6">
          <SectionTitle
            title="How to use this admin"
            description="Smartsheet is still the source of truth. This app controls how live Smartsheet data is presented, filtered, branded, and optionally edited by contributors."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Main workflow</h3>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
                <li>Create a Smartsheet source.</li>
                <li>Create a view connected to that source.</li>
                <li>Configure setup, fields, filters, editing, and branding.</li>
                <li>Preview the output.</li>
                <li>Publish when the page looks right.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Before you start</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
                <li><code className="rounded bg-[color:var(--wsu-stone)]/40 px-1.5 py-0.5 text-xs">SMARTSHEET_API_TOKEN</code> must be valid.</li>
                <li><code className="rounded bg-[color:var(--wsu-stone)]/40 px-1.5 py-0.5 text-xs">DATABASE_URL</code> must point to your production database.</li>
                <li>If contributor editing is enabled, <code className="rounded bg-[color:var(--wsu-stone)]/40 px-1.5 py-0.5 text-xs">CONTRIBUTOR_SESSION_SECRET</code> must be set.</li>
                <li>If you use Supabase, backend-owned public tables must keep RLS enabled.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-sm text-amber-950 sm:text-base">
            <p className="font-semibold">Important password note</p>
            <p className="mt-2 leading-relaxed">
              Contributor passwords are stored as one-way hashes. Admins cannot view them. If someone forgets a password, use a reset link from the Contributors area instead.
            </p>
          </div>
        </section>
      )}

      {activeTab === "sources" && (
        <section id="admin-guide-panel-sources" role="tabpanel" aria-labelledby="admin-guide-tab-sources" className="space-y-6">
          <SectionTitle
            title="Create and test sources"
            description="A source tells the app which Smartsheet sheet or report to read. A view cannot work until the source is valid."
          />

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">What to enter</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li><strong className="text-[color:var(--wsu-ink)]">Source ID:</strong> internal identifier used by the app.</li>
              <li><strong className="text-[color:var(--wsu-ink)]">Label:</strong> human-friendly name shown in admin and public headers.</li>
              <li><strong className="text-[color:var(--wsu-ink)]">Source type:</strong> choose <code className="rounded bg-[color:var(--wsu-stone)]/40 px-1 py-0.5 text-xs">sheet</code> or <code className="rounded bg-[color:var(--wsu-stone)]/40 px-1 py-0.5 text-xs">report</code>.</li>
              <li><strong className="text-[color:var(--wsu-ink)]">Smartsheet ID:</strong> the numeric ID from the Smartsheet URL.</li>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              After saving, always run <strong className="text-[color:var(--wsu-ink)]">Test connection</strong>. If this fails, do not keep building the view until the source is fixed.
            </p>
          </div>

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Common source problems</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Wrong source type selected.</li>
              <li>Smartsheet ID copied incorrectly.</li>
              <li>Token lacks access to the sheet or report.</li>
              <li>Using local-only storage instead of a real database in production.</li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === "setup" && (
        <section id="admin-guide-panel-setup" role="tabpanel" aria-labelledby="admin-guide-tab-setup" className="space-y-6">
          <SectionTitle
            title="Setup tab and layout controls"
            description="Use Setup to define the structure of the page before you fine-tune field behavior."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Basic view details</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
                <li><strong className="text-[color:var(--wsu-ink)]">Source:</strong> the Smartsheet source this view reads from.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">Label:</strong> the public-facing name for the page.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">Slug:</strong> the URL path.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">View ID:</strong> set at creation time and then treated as fixed.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">Description:</strong> optional supporting copy.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">Tab order:</strong> controls order when multiple views share a slug.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Layout presets and overrides</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
                <li>Start with a preset to get a sensible page pattern quickly.</li>
                <li>Use the layout override if you want the same fields in a different presentation such as table, cards, accordion, tabbed, or list/detail.</li>
                <li>For card-style layouts, pick heading and summary fields so the public cards read correctly.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Custom card layout</h3>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              When the layout is cards, list, stacked, accordion, tabbed, or list/detail, you can enable <strong className="text-[color:var(--wsu-ink)]">Custom card layout</strong>.
              That lets you define rows inside the card and place multiple fields side by side.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Use it when default one-field-per-row cards feel too long.</li>
              <li>Add placeholder blanks to keep rows aligned.</li>
              <li>Add static text when the card needs a built-in label or note.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Display controls above the data</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li><strong className="text-[color:var(--wsu-ink)]">Page Header & Branding:</strong> page header, custom text, logo, lockup text, theme, status box, and header-level visibility toggles.</li>
              <li><strong className="text-[color:var(--wsu-ink)]">Content Area:</strong> controls the title section, tabs, row counts, and layout switcher below the header.</li>
              <li>If contributor editing is enabled, the Setup tab also controls whether the header/status area shows the contributor sign-in link and contributor instructions link.</li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === "fields" && (
        <section id="admin-guide-panel-fields" role="tabpanel" aria-labelledby="admin-guide-tab-fields" className="space-y-6">
          <SectionTitle
            title="Fields, display names, and field behavior"
            description="The Fields tab is where you choose which Smartsheet columns appear and how they behave in the public page."
          />

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Basic field workflow</h3>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Load columns from the selected source.</li>
              <li>Check the columns you want to include.</li>
              <li>Edit display names if the public label should differ from the Smartsheet column title.</li>
              <li>Use Arrange to reorder or remove fields.</li>
              <li>Use live preview to see the result as you work.</li>
            </ol>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Render and transform controls</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
                <li><strong className="text-[color:var(--wsu-ink)]">Render as:</strong> text, badge, mailto, list, phone list, and more.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">Transforms:</strong> split, format date, contact emails, contact names, reset to source, and similar cleanup rules.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">List display:</strong> stacked or inline, with a custom delimiter when inline.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Visibility and emphasis</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
                <li><strong className="text-[color:var(--wsu-ink)]">Heading:</strong> main field for cards and accordions.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">Summary:</strong> secondary field for cards and accordions.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">Hide label:</strong> suppresses the field label while keeping the value.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">Hide when empty:</strong> removes the field entirely when the value is blank.</li>
                <li><strong className="text-[color:var(--wsu-ink)]">A-Z index:</strong> picks the field used for the alphabetical jump strip.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">When to use Hide when empty</h3>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              Use <strong className="text-[color:var(--wsu-ink)]">Hide when empty</strong> when a field only applies to some rows. This keeps cards and tables from showing empty labels for optional data such as role-specific contacts, program notes, or secondary locations.
            </p>
          </div>
        </section>
      )}

      {activeTab === "editing" && (
        <section id="admin-guide-panel-editing" role="tabpanel" aria-labelledby="admin-guide-tab-editing" className="space-y-6">
          <SectionTitle
            title="Contributor editing and multi-person groups"
            description="The Editing tab controls whether contributors can update data and exactly which rows and fields they can touch."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Who can edit</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
                <li>Turn on <strong className="text-[color:var(--wsu-ink)]">Enable contributor editing</strong>.</li>
                <li>Select one or more <strong className="text-[color:var(--wsu-ink)]">Contact Columns</strong>.</li>
                <li>If a contributor&apos;s <code className="rounded bg-[color:var(--wsu-stone)]/40 px-1 py-0.5 text-xs">@wsu.edu</code> email appears in one of those columns on a row, they can claim access to that row.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">What they can edit</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
                <li><strong className="text-[color:var(--wsu-ink)]">Editable Fields</strong> define what can be changed.</li>
                <li>Contact columns define <em>who</em> can edit, not <em>what</em> they can edit.</li>
                <li>You must choose at least one editable field or add a multi-person group.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Multi-person field groups</h3>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              Use groups when the sheet stores comma-separated people data, such as coordinator names, coordinator emails, or coordinator phone numbers. A group turns that raw text into one card per person with structured fields such as name, email, and phone.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Create a group label that describes the role, such as "Program coordinators".</li>
              <li>Map the group&apos;s name, email, and phone attributes to the appropriate fields.</li>
              <li>Contributors will then get Add person and Remove controls instead of a single plain-text box.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Public contributor links</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li><strong className="text-[color:var(--wsu-ink)]">Show contributor login link</strong> controls whether the public page shows sign-in entry.</li>
              <li><strong className="text-[color:var(--wsu-ink)]">Show contributor instructions link</strong> adds a public help link that opens in a new window.</li>
              <li>Hiding these links does not remove editing for people who already have the direct URL or an active session.</li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === "publish" && (
        <section id="admin-guide-panel-publish" role="tabpanel" aria-labelledby="admin-guide-tab-publish" className="space-y-6">
          <SectionTitle
            title="Preview, publish, and operate the site"
            description="Use preview deliberately. Publishing should be the last step, not the first check."
          />

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Preview workflow</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Use live preview while mapping fields.</li>
              <li>Use the Preview tab for a fuller page-level check.</li>
              <li>Check layout, branding, tabs, A-Z behavior, search, and contributor links before publishing.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Schema drift and refreshes</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>If a Smartsheet column is renamed or removed, publishing may block until mappings are corrected.</li>
              <li>Refresh schema when source columns changed.</li>
              <li>Re-check contributor contact columns and editable fields after schema changes.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Release checklist</h3>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Confirm environment values and database connectivity.</li>
              <li>Confirm RLS is enabled on backend-owned public tables.</li>
              <li>Preview the public page and verify layout, filters, search, branding, and contributor links.</li>
              <li>If contributor editing is enabled, test first-time access, sign-in, row eligibility, save to Smartsheet, and password reset.</li>
              <li>Commit and push before expecting Vercel to deploy changes.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Related guides</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/instructions/contributor" className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-crimson)] hover:underline">
                Contributor guide
              </Link>
              <Link href="/admin/contributors" className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-crimson)] hover:underline">
                Contributors admin
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
