import type {
  ContactValue,
  PublicLink,
  ResolvedFieldValue,
  ResolvedPersonRoleEntry,
  SmartsheetCell,
  SmartsheetRow,
  TransformConfig,
  ViewFieldConfig,
  ViewPresentationConfig,
} from "@/lib/config/types";
import { instantMillisFromSmartsheetDateString } from "@/lib/display-datetime";

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const EMAIL_TOKEN_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_REGEX = /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/g;
const URL_REGEX = /https?:\/\/[^\s,;]+/gi;

interface TransformContext {
  row: SmartsheetRow;
  sourceCell: SmartsheetCell | null;
}

/** How mailto / tel values render on the public view (not print). */
export type ValueLinkDisplayOptions = {
  linkEmailsInView: boolean;
  linkPhonesInView: boolean;
};

/** Defaults: hyperlink emails, plain phone numbers. */
export function effectiveValueLinkFlags(presentation?: ViewPresentationConfig | null | undefined): ValueLinkDisplayOptions {
  return {
    linkEmailsInView: presentation?.linkEmailsInView !== false,
    linkPhonesInView: presentation?.linkPhonesInView === true,
  };
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(trimmed);
  }

  return unique;
}

function uniqueContacts(values: ContactValue[]) {
  const seen = new Set<string>();
  const unique: ContactValue[] = [];

  for (const value of values) {
    const email = value.email?.trim();
    const name = value.name?.trim();
    const key = `${email?.toLowerCase() ?? ""}|${name?.toLowerCase() ?? ""}`;
    if (key === "|" || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push({ email, name });
  }

  return unique;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isContactValueArray(value: unknown): value is ContactValue[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (entry) =>
        entry == null ||
        (isObjectRecord(entry) &&
          (typeof entry.email === "string" || typeof entry.name === "string"))
    )
  );
}

function parseContactObject(value: unknown): ContactValue[] {
  if (!isObjectRecord(value)) {
    return [];
  }

  if (value.objectType === "CONTACT") {
    return [
      {
        email: typeof value.email === "string" ? value.email : undefined,
        name: typeof value.name === "string" ? value.name : undefined,
      },
    ];
  }

  if (value.objectType === "MULTI_CONTACT") {
    const entries = Array.isArray(value.values) ? value.values : [];
    return uniqueContacts(entries.flatMap((entry) => parseContactObject(entry)));
  }

  if (typeof value.email === "string" || typeof value.name === "string") {
    return [
      {
        email: typeof value.email === "string" ? value.email : undefined,
        name: typeof value.name === "string" ? value.name : undefined,
      },
    ];
  }

  return [];
}

function normalizeToStringList(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeToStringList(entry));
  }

  if (isObjectRecord(value)) {
    const contactValues = parseContactObject(value);
    if (contactValues.length > 0) {
      return contactValues.flatMap((entry) => [entry.name, entry.email].filter(Boolean) as string[]);
    }

    if (Array.isArray(value.values)) {
      return value.values.flatMap((entry) => normalizeToStringList(entry));
    }

    if (Array.isArray(value.value)) {
      return value.value.flatMap((entry) => normalizeToStringList(entry));
    }

    return Object.values(value).flatMap((entry) => normalizeToStringList(entry));
  }

  return [String(value)];
}

function splitTokens(value: unknown, delimiters?: string[]) {
  // When value is ContactValue[], normalizeToStringList yields individual tokens (name, email, ...)
  // with no delimiters between contacts, so split has no effect. Convert to a single string first
  // (e.g. "Lisa Lujan, Deb Marsh") so the delimiter can actually split it.
  // Use isContactValueArray (not toContactList) to avoid recursion — toContactList calls splitTokens.
  let toSplit: string[];
  if (isContactValueArray(value)) {
    toSplit = [
      value
        .map((c) => c.name || c.email || "")
        .filter(Boolean)
        .join(", "),
    ];
  } else {
    toSplit = normalizeToStringList(value);
  }

  const splitDelimiters = delimiters?.length ? delimiters : [",", ";", "\n"];

  return uniqueStrings(
    toSplit.flatMap((entry) => {
      const parts = splitDelimiters.reduce<string[]>((segments, delimiter) => {
        return segments.flatMap((segment) => segment.split(delimiter));
      }, [entry]);
      return parts.map((part) => part.trim()).filter(Boolean);
    })
  );
}

function extractEmails(value: unknown) {
  const contacts = toContactList(value);
  const contactEmails = contacts
    .map((entry) => entry.email?.trim())
    .filter((entry): entry is string => Boolean(entry));

  if (contactEmails.length > 0) {
    return uniqueStrings(contactEmails);
  }

  const matches = normalizeToStringList(value).flatMap((entry) => entry.match(EMAIL_REGEX) ?? []);
  return uniqueStrings(matches);
}

function extractPhones(value: unknown) {
  const matches = normalizeToStringList(value).flatMap((entry) => entry.match(PHONE_REGEX) ?? []);
  return uniqueStrings(matches);
}

function extractUrls(value: unknown) {
  const matches = normalizeToStringList(value).flatMap((entry) => entry.match(URL_REGEX) ?? []);
  return uniqueStrings(matches.map((entry) => entry.replace(/[).,;!?]+$/, "")));
}

function extractNames(value: unknown) {
  const contacts = toContactList(value);
  const names = contacts
    .map((entry) => entry.name?.trim())
    .filter((entry): entry is string => Boolean(entry));

  if (names.length > 0) {
    return uniqueStrings(names);
  }

  return splitTokens(value).filter((token) => !EMAIL_TOKEN_REGEX.test(token) && !(token.match(PHONE_REGEX) ?? []).length);
}

export function toContactList(value: unknown): ContactValue[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (isContactValueArray(value)) {
    return uniqueContacts(value);
  }

  if (Array.isArray(value)) {
    return uniqueContacts(value.flatMap((entry) => toContactList(entry)));
  }

  if (isObjectRecord(value)) {
    const contacts = parseContactObject(value);
    if (contacts.length > 0) {
      return uniqueContacts(contacts);
    }

    if (Array.isArray(value.values)) {
      return uniqueContacts(value.values.flatMap((entry) => toContactList(entry)));
    }

    if (Array.isArray(value.value)) {
      return uniqueContacts(value.value.flatMap((entry) => toContactList(entry)));
    }
  }

  const tokens = splitTokens(value);
  return uniqueContacts(
    tokens.map((token) => {
      const email = token.match(EMAIL_REGEX)?.[0];
      if (email) {
        return { email };
      }
      return { name: token };
    })
  );
}

function formatDate(value: unknown, config?: TransformConfig) {
  const dateCandidate = normalizeToStringList(value)[0];
  if (!dateCandidate) {
    return "";
  }

  const trimmed = dateCandidate.trim();
  const ms = instantMillisFromSmartsheetDateString(trimmed);
  if (ms === null) {
    return dateCandidate;
  }
  const parsed = new Date(ms);

  return new Intl.DateTimeFormat(config?.locale || "en-US", {
    dateStyle: config?.dateStyle || "medium",
    timeStyle: config?.timeStyle,
  }).format(parsed);
}

function asText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap((entry) => normalizeToStringList(entry))).join(", ");
  }
  const contacts = toContactList(value);
  if (contacts.length > 0) {
    return contacts
      .map((entry) => entry.name || entry.email || "")
      .filter(Boolean)
      .join(", ");
  }
  return normalizeToStringList(value).join(", ").trim();
}

/** Plain text for role-group cells and search fallbacks (same rules as text render). */
export function normalizedValueToPlainText(value: unknown): string {
  return asText(value);
}

export function normalizedValueToRoleAttributeText(
  value: unknown,
  attr: "name" | "email" | "phone",
): string {
  if (attr === "email") {
    return extractEmails(value).join(", ");
  }
  if (attr === "phone") {
    return extractPhones(value).join(", ");
  }
  return extractNames(value).join(", ");
}

/** First parseable date/datetime token from normalized cell value (for client time zone formatting). */
export function extractDateSourceRawForDisplay(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  const s = normalizeToStringList(value)[0];
  if (typeof s !== "string") {
    return undefined;
  }
  const t = s.trim();
  if (!t) {
    return undefined;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return t;
  }
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t) &&
    !/[zZ]$|[+-]\d{2}:?\d{2}$/.test(t)
  ) {
    const d = new Date(`${t}Z`);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const parsed = new Date(t);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return t;
}

function sortKeyForDateRaw(rawDateStr: string): string | undefined {
  if (!rawDateStr.trim()) {
    return undefined;
  }
  const isoDateMatch = rawDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, y, m, d] = isoDateMatch;
    return `${y}-${m}-${d}`;
  }
  const ms = instantMillisFromSmartsheetDateString(rawDateStr.trim());
  if (ms === null) {
    return rawDateStr;
  }
  return new Date(ms).toISOString();
}

export function normalizeSourceValue(cell: SmartsheetCell | null): unknown {
  if (!cell) {
    return null;
  }

  if (cell.columnType === "CONTACT_LIST") {
    // Prefer the structured objectValue when the API returns it (more reliable than
    // manually reconstructing from value + displayValue).
    if (cell.objectValue) {
      return toContactList(cell.objectValue);
    }
    return toContactList({
      objectType: "CONTACT",
      email: typeof cell.value === "string" ? cell.value : undefined,
      name: cell.displayValue,
    });
  }

  if (cell.columnType === "MULTI_CONTACT_LIST") {
    if (cell.objectValue) {
      return toContactList(cell.objectValue);
    }
    return toContactList(cell.value ?? cell.displayValue ?? "");
  }

  if (cell.columnType === "MULTI_PICKLIST" && isObjectRecord(cell.objectValue) && Array.isArray(cell.objectValue.values)) {
    return cell.objectValue.values;
  }

  /** DATE / datetimes: use API `value` first — generic objectValue is for predecessors/contacts, not calendar cells. */
  if (
    cell.columnType === "DATE" ||
    cell.columnType === "DATETIME" ||
    cell.columnType === "ABSTRACT_DATETIME"
  ) {
    if (cell.value !== undefined && cell.value !== null && cell.value !== "") {
      return cell.value;
    }
    if (typeof cell.displayValue === "string" && cell.displayValue.trim()) {
      return cell.displayValue;
    }
    return null;
  }

  if (cell.objectValue) {
    return cell.objectValue;
  }

  return cell.value ?? cell.displayValue ?? null;
}

export function applyTransforms(value: unknown, transforms: TransformConfig[] | undefined, context: TransformContext) {
  void context;
  let current = value;

  for (const transform of transforms ?? []) {
    switch (transform.op) {
      case "trim":
        current = Array.isArray(current)
          ? normalizeToStringList(current).map((entry) => entry.trim())
          : typeof current === "string"
            ? current.trim()
            : current;
        break;
      case "split":
        current = splitTokens(current, transform.delimiters ?? (transform.delimiter ? [transform.delimiter] : undefined));
        break;
      case "extract_emails":
        current = extractEmails(current);
        break;
      case "extract_phones":
        current = extractPhones(current);
        break;
      case "dedupe":
        current = isContactValueArray(current)
          ? uniqueContacts(current)
          : uniqueStrings(normalizeToStringList(current));
        break;
      case "filter_empty":
        current = Array.isArray(current)
          ? current.filter((entry) => normalizeToStringList(entry).some((valueEntry) => valueEntry.trim()))
          : current;
        break;
      case "to_contact_list":
        current = toContactList(current);
        break;
      case "contact_names":
        current = extractNames(current);
        break;
      case "contact_emails":
        current = extractEmails(current);
        break;
      case "join":
        current = normalizeToStringList(current).join(transform.separator ?? ", ");
        break;
      case "lowercase":
        current = Array.isArray(current)
          ? normalizeToStringList(current).map((entry) => entry.toLowerCase())
          : asText(current).toLowerCase();
        break;
      case "uppercase":
        current = Array.isArray(current)
          ? normalizeToStringList(current).map((entry) => entry.toUpperCase())
          : asText(current).toUpperCase();
        break;
      case "format_date":
        current = formatDate(current, transform);
        break;
      case "reset_to_source":
        // Resets to the pre-transform source value if the current pipeline value is
        // null or undefined. This is NOT multi-column coalescing — that is handled
        // by source.coalesce[] in the field config.
        current = current ?? value;
        break;
      case "coalesce":
        // Deprecated alias for reset_to_source. Use reset_to_source in new configs.
        current = current ?? value;
        break;
      case "url_from_value":
        // Extracts URL-like tokens from the value. Use with render: { type: "link" }.
        current = extractUrls(current);
        break;
      default:
        current = current;
        break;
    }
  }

  return current;
}

function toEmailLinks(value: unknown): PublicLink[] {
  const contacts = toContactList(value);
  if (contacts.length > 0) {
    const links = contacts
      .filter((entry) => entry.email)
      .map((entry) => ({
        label: entry.name?.trim() || entry.email!.trim(),
        href: `mailto:${entry.email!.trim()}`,
      }));

    if (links.length > 0) {
      return links;
    }
  }

  return extractEmails(value).map((email) => ({
    label: email,
    href: `mailto:${email}`,
  }));
}

function normalizePhoneHref(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function toPhoneLinks(value: unknown): PublicLink[] {
  return extractPhones(value).map((phone) => ({
    label: phone,
    href: `tel:${normalizePhoneHref(phone)}`,
  }));
}

function toUrlLinks(value: unknown): PublicLink[] {
  return extractUrls(value).map((entry) => ({
    label: entry,
    href: entry,
  }));
}

function buildTextList(value: unknown) {
  const contacts = toContactList(value);
  if (contacts.length > 0) {
    return uniqueStrings(contacts.map((entry) => entry.name || entry.email || "").filter(Boolean));
  }

  return uniqueStrings(normalizeToStringList(value).map((entry) => entry.trim()).filter(Boolean));
}

export interface BuildResolvedFieldOptions {
  dateSourceRaw?: string;
}

export function buildResolvedFieldValue(
  field: ViewFieldConfig,
  value: unknown,
  linkDisplay?: ValueLinkDisplayOptions,
  buildOptions?: BuildResolvedFieldOptions,
): ResolvedFieldValue {
  const renderType = field.render.type;
  const emptyLabel = field.render.emptyLabel ?? "";
  let textValue = "";
  let sortValue: string | undefined;
  let listValue: string[] = [];
  let links: PublicLink[] = [];
  const wantEmailLinks = linkDisplay?.linkEmailsInView !== false;
  const wantPhoneLinks = linkDisplay?.linkPhonesInView === true;

  switch (renderType) {
    case "mailto":
    case "mailto_list": {
      const emailLinks = toEmailLinks(value);
      links = wantEmailLinks ? emailLinks : [];
      listValue = emailLinks.map((entry) => entry.label);
      textValue = listValue.join(", ");
      break;
    }
    case "phone":
    case "phone_list": {
      const phoneLinks = toPhoneLinks(value);
      links = wantPhoneLinks ? phoneLinks : [];
      listValue = phoneLinks.map((entry) => entry.label);
      textValue = listValue.join(", ");
      break;
    }
    case "link":
      links = toUrlLinks(value);
      listValue = links.map((entry) => entry.label);
      textValue = listValue.join(", ");
      break;
    case "list":
      listValue = buildTextList(value);
      textValue = listValue.join(", ");
      break;
    case "multiline_text":
      textValue = normalizeToStringList(value).join("\n").trim();
      listValue = textValue ? textValue.split("\n").filter(Boolean) : [];
      break;
    case "date": {
      const rawDateStr = normalizeToStringList(value)[0] ?? "";
      if (rawDateStr) {
        sortValue = sortKeyForDateRaw(rawDateStr);
      }
      textValue = formatDate(value);
      listValue = textValue ? [textValue] : [];
      break;
    }
    case "badge": {
      // One pill per token: MULTI_PICKLIST arrays, merged "A; B", and comma-joined Smartsheet text all become multiple entries.
      listValue = splitTokens(value);
      textValue = listValue.join(", ");
      break;
    }
    case "hidden": {
      // Keep raw text for grouping, merge, and contributor edit even though the field is not shown.
      textValue = asText(value);
      listValue = textValue ? [textValue] : [];
      break;
    }
    case "people_group":
      return buildResolvedPeopleGroupField(field, []);
    default: {
      // "text" and others: when value is array (e.g. from split transform) and listDisplay is set, support stacked/inline list
      const isArray = Array.isArray(value) && value.length > 0;
      if (isArray && field.render.listDisplay) {
        listValue = buildTextList(value);
        textValue = listValue.join(field.render.listDelimiter ?? ", ");
      } else {
        textValue = asText(value);
        listValue = textValue ? [textValue] : [];
      }
      break;
    }
  }

  const isEmpty = !textValue && links.length === 0 && listValue.length === 0;

  return {
    key: field.key,
    label: field.label || field.key,
    renderType,
    textValue: isEmpty ? emptyLabel : textValue,
    sortValue,
    listValue: isEmpty && emptyLabel ? [emptyLabel] : listValue,
    links,
    isEmpty,
    hideWhenEmpty: field.emptyBehavior === "hide",
    hideLabel: field.hideLabel,
    textStyle: field.render.textStyle,
    labelStyle: field.render.labelStyle,
    listDelimiter: field.render.listDelimiter,
    listDisplay: field.render.listDisplay,
    peopleStyle: field.render.peopleStyle,
    ...(buildOptions?.dateSourceRaw ? { dateSourceRaw: buildOptions.dateSourceRaw } : {}),
  };
}

export function publicLinkFromSmartsheetCell(cell: SmartsheetCell | null): PublicLink | null {
  if (!cell) {
    return null;
  }
  const rawUrl = cell.hyperlink?.url;
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return null;
  }
  const href = rawUrl.trim();
  const fromDisplay = typeof cell.displayValue === "string" ? cell.displayValue.trim() : "";
  const fromValue = typeof cell.value === "string" ? cell.value.trim() : "";
  const label = fromDisplay || fromValue || href;
  return { href, label };
}

/** When Smartsheet provides a cell hyperlink and we did not derive links from the cell value, attach it. */
export function applySmartsheetHyperlinkToResolvedField(
  field: ResolvedFieldValue,
  cell: SmartsheetCell | null,
  linkDisplay?: ValueLinkDisplayOptions,
): ResolvedFieldValue {
  const sheetLink = publicLinkFromSmartsheetCell(cell);
  if (!sheetLink || field.links.length > 0) {
    return field;
  }
  const hrefLower = sheetLink.href.trim().toLowerCase();
  const flags = linkDisplay ?? effectiveValueLinkFlags(undefined);
  if (hrefLower.startsWith("mailto:") && !flags.linkEmailsInView) {
    return field;
  }
  if (hrefLower.startsWith("tel:") && !flags.linkPhonesInView) {
    return field;
  }
  const canAttach =
    field.renderType === "link" ||
    field.renderType === "text" ||
    field.renderType === "multiline_text" ||
    field.renderType === "badge";
  if (!canAttach) {
    return field;
  }

  const hasText = Boolean(field.textValue?.trim());
  const hasList = field.listValue.some((e) => String(e).trim());
  const label = sheetLink.label || sheetLink.href;

  return {
    ...field,
    links: [sheetLink],
    isEmpty: false,
    textValue: hasText ? field.textValue : label,
    listValue: hasList ? field.listValue : label ? [label] : [],
  };
}

function personEntryToSummaryLines(
  entry: ResolvedPersonRoleEntry,
  linkDisplay: ValueLinkDisplayOptions,
): { textLines: string[]; links: PublicLink[] } {
  const textLines: string[] = [];
  const links: PublicLink[] = [];
  const name = entry.name?.trim();
  const email = entry.email?.trim();
  const phone = entry.phone?.trim();
  if (name) {
    textLines.push(name);
  }
  if (email) {
    textLines.push(email);
    if (linkDisplay.linkEmailsInView) {
      links.push({ label: email, href: `mailto:${email}` });
    }
  }
  if (phone) {
    textLines.push(phone);
    if (linkDisplay.linkPhonesInView) {
      links.push({ label: phone, href: `tel:${phone.replace(/[^\d+]/g, "")}` });
    }
  }
  return { textLines, links };
}

export function buildResolvedPeopleGroupField(
  field: ViewFieldConfig,
  people: ResolvedPersonRoleEntry[],
  options?: { roleGroupReadOnly?: boolean; linkDisplay?: ValueLinkDisplayOptions },
): ResolvedFieldValue {
  const renderType = field.render.type;
  const emptyLabel = field.render.emptyLabel ?? "";
  const populated = people.filter((p) => !p.isEmpty);
  const textSegments: string[] = [];
  const listValue: string[] = [];
  const links: PublicLink[] = [];
  const linkDisplay = options?.linkDisplay ?? effectiveValueLinkFlags(undefined);

  for (const entry of populated) {
    const { textLines, links: entryLinks } = personEntryToSummaryLines(entry, linkDisplay);
    if (textLines.length > 0) {
      const block = textLines.join("\n");
      textSegments.push(block);
      listValue.push(block);
    }
    links.push(...entryLinks);
  }

  const textValue = textSegments.join("\n\n").trim();
  const isEmpty = populated.length === 0;
  const firstSort = populated[0]?.name?.trim() || populated[0]?.email?.trim() || populated[0]?.phone?.trim();

  return {
    key: field.key,
    label: field.label || field.key,
    renderType,
    textValue: isEmpty ? emptyLabel : textValue,
    sortValue: firstSort?.toLowerCase(),
    listValue: isEmpty && emptyLabel ? [emptyLabel] : listValue,
    links,
    people,
    roleGroupReadOnly: options?.roleGroupReadOnly,
    isEmpty,
    hideWhenEmpty: field.emptyBehavior === "hide",
    hideLabel: field.hideLabel,
    textStyle: field.render.textStyle,
    labelStyle: field.render.labelStyle,
    listDelimiter: field.render.listDelimiter,
    listDisplay: field.render.listDisplay ?? "inline",
    peopleStyle: field.render.peopleStyle ?? "plain",
  };
}
