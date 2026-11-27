// Pure helpers for Production Context Switcher routing, bucketing, and search.

export interface SwitcherShow {
  id: number;
  title: string;
  season?: string;
  status?: string;
  isActive?: boolean;
  location?: string;
  productionSession?: string;
  image?: string | null;
}

export type ShowBucket = "active" | "upcoming" | "archive";

export function classifyShowBucket(show: Pick<SwitcherShow, "isActive" | "status">): ShowBucket {
  if (show.isActive || show.status === "Active") return "active";
  if (show.status === "Upcoming" || show.status === "Pre-Production") return "upcoming";
  return "archive";
}

/**
 * Given the current browser pathname, tenant slug, and target production ID,
 * returns the clean destination URL for switching production context.
 *
 * IMPORTANT: On subdomain hosts (e.g. `cytfred.open-backstage.org`), middleware
 * automatically rewrites `/...` -> `/cytfred/...`, so browser URLs must NOT have
 * `/${tenant}` prepended (otherwise middleware rewrites `/cytfred` -> `/cytfred/cytfred` 404).
 *
 * - Preserves `/${tenant}` ONLY when `currentPath` already starts with `/${tenant}`
 *   (path-based local routing like `localhost:3001/cytfred/...`).
 * - On `/production/12/schedule` (or `/cytfred/production/12/schedule`), swaps the
 *   production ID to `targetProductionId` and preserves the sub-route.
 * - On `/` or global routes (`/box-office`, `/reports`, `/production`), stays on
 *   that exact path so the server re-renders using the updated `active_production_id` cookie.
 */
export function resolveShowSwitchPath(
  currentPath: string,
  tenant: string,
  targetProductionId: number
): string {
  const cleanTenant = tenant.trim().replace(/^\/+|\/+$/g, "");
  const normalizedPath = (currentPath || "/").trim() || "/";
  const withLeadingSlash = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;

  const hasTenantPrefix =
    Boolean(cleanTenant) &&
    (withLeadingSlash === `/${cleanTenant}` ||
      withLeadingSlash.startsWith(`/${cleanTenant}/`));

  // Match `/[tenant]/production/[id]/...` or `/production/[id]/...`
  const prodMatch = withLeadingSlash.match(
    /^(?:\/([^/]+))?\/production\/(\d+)(\/.*)?$/
  );

  if (prodMatch) {
    const matchedPrefix = prodMatch[1];
    const suffix = prodMatch[3] || "";
    if (matchedPrefix) {
      return `/${matchedPrefix}/production/${targetProductionId}${suffix}`;
    }
    return `/production/${targetProductionId}${suffix}`;
  }

  // Non-production routes: keep the exact path format the browser is already on
  if (hasTenantPrefix) {
    return withLeadingSlash;
  }

  return withLeadingSlash;
}

/**
 * Orders shows within a theater season chronologically: Fall -> Winter -> Spring -> Summer.
 */
export function getSessionSortRank(sessionLabel?: string | null): number {
  const s = (sessionLabel || "").trim().toLowerCase();
  if (s.includes("fall")) return 0;
  if (s.includes("winter")) return 1;
  if (s.includes("spring")) return 2;
  if (s.includes("summer")) return 3;
  return 4;
}

export function sortShowsBySession<T extends SwitcherShow>(shows: T[]): T[] {
  return [...shows].sort((a, b) => {
    const rankDiff =
      getSessionSortRank(a.productionSession) - getSessionSortRank(b.productionSession);
    if (rankDiff !== 0) return rankDiff;
    return (a.title || "").localeCompare(b.title || "");
  });
}

/**
 * Case-insensitive filter across show title, season, location, status, and session label.
 */
export function filterShowsByQuery<T extends SwitcherShow>(shows: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return shows;
  return shows.filter((s) => {
    const haystack = [
      s.title,
      s.season,
      s.location,
      s.status,
      s.productionSession,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
