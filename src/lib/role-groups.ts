import type {
  FieldSourceSelector,
  RoleGroupFieldSource,
  SmartsheetColumn,
  SmartsheetRow,
  SourceRoleGroupConfig,
  SourceRoleGroupSlotConfig,
  ViewFieldSourceConfig,
} from "@/lib/config/types";
import { slugify } from "@/lib/utils";
import { normalizeColumnKey } from "@/lib/smartsheet";

export function isRoleGroupFieldSource(source: ViewFieldSourceConfig): source is RoleGroupFieldSource {
  return typeof source === "object" && source !== null && "kind" in source && (source as RoleGroupFieldSource).kind === "role_group";
}

type ParsedNumberedTitle = { baseLabel: string; slot: string; attr: "name" | "email" | "phone" };

/**
 * Detects numbered slot columns per build.md: trailing slot number, optional Name / Email / Phone suffix,
 * or bare role label as the name column.
 */
export function parseNumberedRoleColumnTitle(title: string): ParsedNumberedTitle | null {
  const t = title.trim();
  const slotMatch = t.match(/^(.+?)\s+(\d+)$/);
  if (!slotMatch) {
    return null;
  }
  const rest = slotMatch[1]!.trim();
  const slot = slotMatch[2]!;

  const suffixes: Array<{ re: RegExp; attr: "name" | "email" | "phone" }> = [
    { re: /^(.+)\s+Phone Number$/i, attr: "phone" },
    { re: /^(.+)\s+Phone$/i, attr: "phone" },
    { re: /^(.+)\s+Email$/i, attr: "email" },
    { re: /^(.+)\s+Name$/i, attr: "name" },
  ];

  for (const { re, attr } of suffixes) {
    const m = rest.match(re);
    if (m) {
      return { baseLabel: m[1]!.trim(), slot, attr };
    }
  }

  return { baseLabel: rest, slot, attr: "name" };
}

function slotOrderingKey(slot: string): number | string {
  const n = Number(slot);
  return Number.isFinite(n) ? n : slot;
}

function compareSlots(a: string, b: string): number {
  const ka = slotOrderingKey(a);
  const kb = slotOrderingKey(b);
  if (typeof ka === "number" && typeof kb === "number") {
    return ka - kb;
  }
  return String(ka).localeCompare(String(kb), undefined, { numeric: true });
}

type MutableSlot = { slot: string; name?: FieldSourceSelector; email?: FieldSourceSelector; phone?: FieldSourceSelector };

/** Maps parallel columns that share a coordinator prefix (e.g. bare “… or Designee N” vs “… Email N”). */
export function clusterKeyForRoleBase(baseLabel: string): string {
  return baseLabel.replace(/\s+or\s+Designee\s*$/i, "").trim();
}

/**
 * Proposes numbered-slot role groups by clustering Smartsheet columns on shared base label + slot.
 */
export function detectNumberedRoleGroupsFromColumns(columns: SmartsheetColumn[]): SourceRoleGroupConfig[] {
  const byBase = new Map<string, Map<string, MutableSlot>>();
  const displayLabelByCluster = new Map<string, string>();

  for (const col of columns) {
    const parsed = parseNumberedRoleColumnTitle(col.title);
    if (!parsed) {
      continue;
    }
    const clusterKey = clusterKeyForRoleBase(parsed.baseLabel);
    const prevLabel = displayLabelByCluster.get(clusterKey);
    if (!prevLabel || parsed.baseLabel.length > prevLabel.length) {
      displayLabelByCluster.set(clusterKey, parsed.baseLabel);
    }
    const inner = byBase.get(clusterKey) ?? new Map<string, MutableSlot>();
    if (!byBase.has(clusterKey)) {
      byBase.set(clusterKey, inner);
    }
    let slotCell = inner.get(parsed.slot);
    if (!slotCell) {
      slotCell = { slot: parsed.slot };
      inner.set(parsed.slot, slotCell);
    }
    const sel: FieldSourceSelector = { columnId: col.id, columnTitle: col.title, columnType: col.type };
    if (parsed.attr === "name") {
      slotCell.name = sel;
    } else if (parsed.attr === "email") {
      slotCell.email = sel;
    } else {
      slotCell.phone = sel;
    }
  }

  const result: SourceRoleGroupConfig[] = [];
  const usedIds = new Set<string>();
  for (const [clusterKey, slotsMap] of byBase) {
    if (slotsMap.size < 1) {
      continue;
    }
    const baseLabel = displayLabelByCluster.get(clusterKey) ?? clusterKey;
    const slots: SourceRoleGroupSlotConfig[] = [...slotsMap.values()].sort((a, b) => compareSlots(a.slot, b.slot));
    let id = slugify(clusterKey);
    let n = 0;
    while (usedIds.has(id)) {
      n += 1;
      id = `${slugify(clusterKey)}_${n}`;
    }
    usedIds.add(id);
    result.push({
      id,
      label: baseLabel,
      defaultDisplayLabel: baseLabel,
      mode: "numbered_slots",
      slots,
    });
  }

  return result.sort((a, b) => a.label.localeCompare(b.label));
}

export function mergeRoleGroupSuggestions(
  existing: SourceRoleGroupConfig[] | undefined,
  detected: SourceRoleGroupConfig[],
): SourceRoleGroupConfig[] {
  const byId = new Map<string, SourceRoleGroupConfig>();
  for (const g of existing ?? []) {
    byId.set(g.id, g);
  }
  for (const g of detected) {
    if (!byId.has(g.id)) {
      byId.set(g.id, g);
    }
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function countDelimitedRoleAttributes(delimited: SourceRoleGroupConfig["delimited"]): number {
  if (!delimited) {
    return 0;
  }
  let n = 0;
  if (delimited.name?.source) {
    n++;
  }
  if (delimited.email?.source) {
    n++;
  }
  if (delimited.phone?.source) {
    n++;
  }
  return n;
}

export function isUnsafeDelimitedRoleGroup(group: SourceRoleGroupConfig): boolean {
  return (
    group.mode === "delimited_parallel" &&
    countDelimitedRoleAttributes(group.delimited) > 1 &&
    group.delimited?.trustPairing !== true
  );
}

export function isWritableRoleGroup(group: SourceRoleGroupConfig): boolean {
  if (group.mode === "numbered_slots") {
    return group.slots?.some((slot) => Boolean(slot.name || slot.email || slot.phone)) ?? false;
  }
  return countDelimitedRoleAttributes(group.delimited) > 0 && !isUnsafeDelimitedRoleGroup(group);
}
