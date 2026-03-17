import type { ResolvedFieldValue } from "@/lib/config/types";

function EmptyValue() {
  return <span className="text-[color:var(--wsu-border)]">-</span>;
}

function renderLinkList(field: ResolvedFieldValue, stacked: boolean) {
  if (field.links.length === 0) {
    return <EmptyValue />;
  }

  if (stacked || field.links.length > 1) {
    return (
      <ul className="space-y-1">
        {field.links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <a
              href={link.href}
              className="text-[color:var(--wsu-crimson)] underline decoration-[color:var(--wsu-border)] underline-offset-4 hover:text-[color:var(--wsu-crimson-dark)]"
              target={field.renderType === "link" ? "_blank" : undefined}
              rel={field.renderType === "link" ? "noreferrer" : undefined}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  const link = field.links[0]!;
  return (
    <a
      href={link.href}
      className="text-[color:var(--wsu-crimson)] underline decoration-[color:var(--wsu-border)] underline-offset-4 hover:text-[color:var(--wsu-crimson-dark)]"
      target={field.renderType === "link" ? "_blank" : undefined}
      rel={field.renderType === "link" ? "noreferrer" : undefined}
    >
      {link.label}
    </a>
  );
}

export function FieldValue({
  field,
  stacked = false,
}: {
  field: ResolvedFieldValue;
  stacked?: boolean;
}) {
  if (field.renderType === "hidden") {
    return null;
  }

  // emptyBehavior: "hide" — in table layout, render nothing (not even the dash placeholder)
  // so the cell is visually empty rather than showing "-".
  if (field.hideWhenEmpty && field.isEmpty) {
    return null;
  }

  if ((field.renderType === "mailto" || field.renderType === "mailto_list" || field.renderType === "phone" || field.renderType === "phone_list" || field.renderType === "link") && field.links.length > 0) {
    return renderLinkList(field, stacked || field.renderType.endsWith("_list"));
  }

  if (field.renderType === "list") {
    if (field.listValue.length === 0) {
      return <EmptyValue />;
    }
    return (
      <ul className="space-y-1">
        {field.listValue.map((entry) => (
          <li key={entry} className="leading-6 text-[color:var(--wsu-ink)]">
            {entry}
          </li>
        ))}
      </ul>
    );
  }

  if (field.renderType === "multiline_text") {
    return field.textValue ? (
      <p className="whitespace-pre-line leading-6 text-[color:var(--wsu-ink)]">{field.textValue}</p>
    ) : (
      <EmptyValue />
    );
  }

  if (field.renderType === "badge") {
    return field.textValue ? (
      <span className="inline-flex rounded-full border border-[color:var(--wsu-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-crimson)]">
        {field.textValue}
      </span>
    ) : (
      <EmptyValue />
    );
  }

  return field.textValue ? (
    <span className="leading-6 text-[color:var(--wsu-ink)]">{field.textValue}</span>
  ) : (
    <EmptyValue />
  );
}
