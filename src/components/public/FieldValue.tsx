import type { ResolvedFieldValue } from "@/lib/config/types";
import { fieldValueTypographyClass } from "@/lib/field-typography";

function tx(field: ResolvedFieldValue, ...classes: string[]) {
  const t = fieldValueTypographyClass(field);
  return [t, ...classes].filter(Boolean).join(" ");
}

function EmptyValue() {
  return <span className="text-[color:var(--wsu-border)]">-</span>;
}

function PersonSummary({
  name,
  email,
  phone,
  compact = false,
  plainValueLinks = false,
}: {
  name?: string;
  email?: string;
  phone?: string;
  compact?: boolean;
  plainValueLinks?: boolean;
}) {
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;
  const detailClass = "view-people-detail view-field-link";

  return (
    <>
      {name ? <span className={`view-people-name ${compact ? "" : "block"}`}>{name}</span> : null}
      {email ? (
        plainValueLinks ? (
          <span className="view-people-detail text-[color:var(--wsu-ink)]">{email}</span>
        ) : (
          <a href={`mailto:${email}`} className={detailClass}>
            {email}
          </a>
        )
      ) : null}
      {phone ? (
        compact ? (
          plainValueLinks ? (
            <span className="view-people-detail text-[color:var(--wsu-ink)]">{phone}</span>
          ) : (
            <a href={telHref} className={detailClass}>
              {phone}
            </a>
          )
        ) : (
          <span className="mt-0.5 block">
            {plainValueLinks ? (
              <span className="view-people-detail text-[color:var(--wsu-ink)]">{phone}</span>
            ) : (
              <a href={telHref} className={`${detailClass} block`}>
                {phone}
              </a>
            )}
          </span>
        )
      ) : null}
    </>
  );
}

function renderLinkList(field: ResolvedFieldValue, stacked: boolean, plainValueLinks: boolean) {
  if (field.links.length === 0) {
    return <EmptyValue />;
  }

  const useInline = field.listDisplay === "inline" && field.links.length > 1;
  const delimiter = field.listDelimiter ?? ", ";
  if (useInline) {
    return (
      <span className={tx(field, "leading-6 text-[color:var(--wsu-ink)]")}>
        {field.links.map((link, i) => (
          <span key={`${link.href}-${link.label}`}>
            {i > 0 && <span className="text-[color:var(--wsu-muted)]">{delimiter}</span>}
            {plainValueLinks ? (
              <span className="text-[color:var(--wsu-ink)]">{link.label}</span>
            ) : (
              <a
                href={link.href}
                className={`view-field-link ${fieldValueTypographyClass(field)}`}
                target={/^https?:\/\//i.test(link.href) ? "_blank" : undefined}
                rel={/^https?:\/\//i.test(link.href) ? "noreferrer" : undefined}
              >
                {link.label}
              </a>
            )}
          </span>
        ))}
      </span>
    );
  }

  if (stacked || field.listDisplay === "stacked" || field.links.length > 1) {
    return (
      <ul className={tx(field, "space-y-1")}>
        {field.links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            {plainValueLinks ? (
              <span className="text-[color:var(--wsu-ink)]">{link.label}</span>
            ) : (
              <a
                href={link.href}
                className={`view-field-link ${fieldValueTypographyClass(field)}`}
                target={/^https?:\/\//i.test(link.href) ? "_blank" : undefined}
                rel={/^https?:\/\//i.test(link.href) ? "noreferrer" : undefined}
              >
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    );
  }

  const link = field.links[0]!;
  if (plainValueLinks) {
    return <span className={tx(field, "leading-6 text-[color:var(--wsu-ink)]")}>{link.label}</span>;
  }
  return (
    <a
      href={link.href}
      className={tx(field, "view-field-link leading-6")}
      target={/^https?:\/\//i.test(link.href) ? "_blank" : undefined}
      rel={/^https?:\/\//i.test(link.href) ? "noreferrer" : undefined}
    >
      {link.label}
    </a>
  );
}

export function FieldValue({
  field,
  stacked = false,
  plainValueLinks = false,
}: {
  field: ResolvedFieldValue;
  stacked?: boolean;
  /** When true (e.g. print layout), show link labels as plain text — no anchors. */
  plainValueLinks?: boolean;
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
    return renderLinkList(field, stacked || field.renderType.endsWith("_list"), plainValueLinks);
  }

  if ((field.renderType === "text" || field.renderType === "badge") && field.links.length > 0) {
    if (field.links.length === 1) {
      const link = field.links[0]!;
      const newTab = /^https?:\/\//i.test(link.href);
      const showText = Boolean(field.textValue?.trim() && field.textValue.trim() !== link.label.trim());
      return (
        <span className={tx(field, "leading-6 text-[color:var(--wsu-ink)]")}>
          {showText ? <>{field.textValue} </> : null}
          {plainValueLinks ? (
            <span>{link.label}</span>
          ) : (
            <a
              href={link.href}
              className={tx(field, "view-field-link")}
              target={newTab ? "_blank" : undefined}
              rel={newTab ? "noreferrer" : undefined}
            >
              {link.label}
            </a>
          )}
        </span>
      );
    }
    return renderLinkList({ ...field, renderType: "link" }, stacked, plainValueLinks);
  }

  if (field.renderType === "list") {
    if (field.listValue.length === 0) {
      return <EmptyValue />;
    }
    const listDelimiter = field.listDelimiter ?? ", ";
    if (field.listDisplay === "inline") {
      return (
        <span className={tx(field, "leading-6 text-[color:var(--wsu-ink)]")}>
          {field.listValue.map((entry, i) => (
            <span key={entry}>
              {i > 0 && <span className="text-[color:var(--wsu-muted)]">{listDelimiter}</span>}
              {entry}
            </span>
          ))}
        </span>
      );
    }
    return (
      <ul className={tx(field, "space-y-1")}>
        {field.listValue.map((entry) => (
          <li key={entry} className="leading-6 text-[color:var(--wsu-ink)]">
            {entry}
          </li>
        ))}
      </ul>
    );
  }

  if (field.renderType === "people_group") {
    const populated = field.people?.filter((p) => !p.isEmpty) ?? [];
    if (populated.length > 0) {
      const displayMode = field.listDisplay === "stacked" ? "stacked" : "inline";
      const peopleStyle = field.peopleStyle === "capsule" ? "capsule" : "plain";
      if (displayMode === "inline") {
        return (
          <ul
            className={tx(
              field,
              peopleStyle === "capsule" ? "grid gap-3" : "grid gap-x-6 gap-y-3",
            )}
            style={{
              gridTemplateColumns:
                populated.length > 1 ? "repeat(auto-fit, minmax(11rem, 1fr))" : "minmax(0, 1fr)",
            }}
          >
            {populated.map((person) => (
              <li
                key={person.slot}
                className={peopleStyle === "capsule" ? "min-w-0 rounded-2xl border px-3 py-2 leading-6 text-[color:var(--wsu-ink)]" : "min-w-0 leading-6 text-[color:var(--wsu-ink)]"}
                style={
                  peopleStyle === "capsule"
                    ? {
                        borderColor: "var(--view-control-border, var(--wsu-border))",
                        backgroundColor: "color-mix(in srgb, var(--view-surface-muted-bg, var(--wsu-stone)) 32%, white)",
                      }
                    : undefined
                }
              >
                <div className="min-w-0">
                  <PersonSummary name={person.name} email={person.email} phone={person.phone} plainValueLinks={plainValueLinks} />
                </div>
              </li>
            ))}
          </ul>
        );
      }

      return (
        <ul className={tx(field, peopleStyle === "capsule" ? "space-y-3" : "space-y-2")}>
          {populated.map((person) => (
            <li
              key={person.slot}
              className={peopleStyle === "capsule" ? "rounded-2xl border px-3 py-2 leading-6 text-[color:var(--wsu-ink)]" : "leading-6 text-[color:var(--wsu-ink)]"}
              style={
                peopleStyle === "capsule"
                  ? {
                      borderColor: "var(--view-control-border, var(--wsu-border))",
                      backgroundColor: "color-mix(in srgb, var(--view-surface-muted-bg, var(--wsu-stone)) 24%, white)",
                    }
                  : undefined
              }
            >
              <PersonSummary name={person.name} email={person.email} phone={person.phone} plainValueLinks={plainValueLinks} />
            </li>
          ))}
        </ul>
      );
    }
    if (field.textValue) {
      return <span className={tx(field, "leading-6 whitespace-pre-line text-[color:var(--wsu-ink)]")}>{field.textValue}</span>;
    }
  }

  if (field.renderType === "multiline_text") {
    if (field.links.length > 0) {
      return (
        <div className={tx(field, "space-y-2")}>
          {field.textValue ? (
            <p className={tx(field, "whitespace-pre-line leading-6 text-[color:var(--wsu-ink)]")}>{field.textValue}</p>
          ) : null}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {field.links.map((link) => {
              const newTab = /^https?:\/\//i.test(link.href);
              return plainValueLinks ? (
                <span key={`${link.href}-${link.label}`} className="text-[color:var(--wsu-ink)]">
                  {link.label}
                </span>
              ) : (
                <a
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className={tx(field, "view-field-link")}
                  target={newTab ? "_blank" : undefined}
                  rel={newTab ? "noreferrer" : undefined}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
      );
    }
    return field.textValue ? (
      <p className={tx(field, "whitespace-pre-line leading-6 text-[color:var(--wsu-ink)]")}>{field.textValue}</p>
    ) : (
      <EmptyValue />
    );
  }

  if (field.renderType === "badge") {
    return field.textValue ? (
      <span
        className={tx(field, "inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]")}
        style={{
          borderColor: "var(--view-border, var(--wsu-border))",
          backgroundColor: "var(--view-badge-bg, #f3f4f6)",
          color: "var(--view-badge-text, #374151)",
        }}
      >
        {field.textValue}
      </span>
    ) : (
      <EmptyValue />
    );
  }

  // text type with split transform: listValue has multiple items, use list display
  if (field.renderType === "text" && field.listValue.length > 1 && field.listDisplay) {
    const listDelimiter = field.listDelimiter ?? ", ";
    if (field.listDisplay === "inline") {
      return (
        <span className={tx(field, "leading-6 text-[color:var(--wsu-ink)]")}>
          {field.listValue.map((entry, i) => (
            <span key={entry}>
              {i > 0 && <span className="text-[color:var(--wsu-muted)]">{listDelimiter}</span>}
              {entry}
            </span>
          ))}
        </span>
      );
    }
    return (
      <ul className={tx(field, "space-y-1")}>
        {field.listValue.map((entry) => (
          <li key={entry} className="leading-6 text-[color:var(--wsu-ink)]">
            {entry}
          </li>
        ))}
      </ul>
    );
  }

  return field.textValue ? (
    <span className={tx(field, "leading-6 text-[color:var(--wsu-ink)]")}>{field.textValue}</span>
  ) : (
    <EmptyValue />
  );
}
