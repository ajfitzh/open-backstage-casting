// scripts/baserow-import-helpers.ts
// Pure, testable data conversion helpers for importing Baserow rows into PostgreSQL.

export function extractText(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    const parts = val
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return String(obj.value ?? obj.name ?? obj.url ?? "").trim();
        }
        return "";
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const v = obj.value ?? obj.name ?? obj.url;
    return v !== undefined && v !== null && String(v).trim() !== "" ? String(v).trim() : null;
  }
  return null;
}

export function extractSelect(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val.trim() || null;
  if (typeof val === "object" && !Array.isArray(val)) {
    const v = (val as Record<string, unknown>).value;
    return typeof v === "string" && v.trim() ? v.trim() : null;
  }
  return null;
}

export function extractMultiSelect(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const v = (item as Record<string, unknown>).value;
        return typeof v === "string" ? v.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

export function extractNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val === "string") {
    const parsed = Number.parseFloat(val.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function extractInt(val: unknown): number | null {
  const num = extractNumber(val);
  return num === null ? null : Math.round(num);
}

export function extractBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const normalized = val.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1";
  }
  if (typeof val === "number") return val === 1;
  return false;
}

export function extractFileUrl(val: unknown): string | null {
  if (typeof val === "string") return val.trim() || null;
  if (Array.isArray(val) && val.length > 0) {
    const first = val[0];
    if (typeof first === "string") return first.trim() || null;
    if (first && typeof first === "object") {
      const url = (first as Record<string, unknown>).url;
      return typeof url === "string" && url.trim() ? url.trim() : null;
    }
  }
  return null;
}

export function extractFileUrls(val: unknown): string[] {
  if (typeof val === "string" && val.trim()) return [val.trim()];
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const url = (item as Record<string, unknown>).url;
        return typeof url === "string" ? url.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

export function extractFirstLinkId(val: unknown): number | null {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (Array.isArray(val) && val.length > 0) {
    const first = val[0];
    if (typeof first === "number" && Number.isFinite(first)) return first;
    if (first && typeof first === "object") {
      const id = (first as Record<string, unknown>).id;
      if (typeof id === "number" && Number.isFinite(id)) return id;
    }
  }
  return null;
}

export function extractAllLinkIds(val: unknown): number[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => {
      if (typeof item === "number" && Number.isFinite(item)) return item;
      if (item && typeof item === "object") {
        const id = (item as Record<string, unknown>).id;
        return typeof id === "number" && Number.isFinite(id) ? id : null;
      }
      return null;
    })
    .filter((id): id is number => id !== null);
}

export function safeParseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "object") return val as T;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function mapLinkedId(
  rawLinkField: unknown,
  idMap: Map<number, number>
): number | null {
  const baserowId = extractFirstLinkId(rawLinkField);
  if (baserowId === null) return null;
  return idMap.get(baserowId) ?? null;
}

export function mapLinkedIds(
  rawLinkField: unknown,
  idMap: Map<number, number>
): number[] {
  return extractAllLinkIds(rawLinkField)
    .map((bId) => idMap.get(bId))
    .filter((id): id is number => typeof id === "number");
}

export function normalizeEmail(val: unknown): string | null {
  const text = extractText(val);
  return text ? text.toLowerCase() : null;
}

export function slugifyOrgName(input: string): string {
  return (
    (input || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "new-org"
  );
}
