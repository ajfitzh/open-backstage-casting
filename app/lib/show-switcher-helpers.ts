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
 * - On `/[tenant]/production/12/schedule` (or `/production/12/schedule`), swaps
 *   the production ID to `targetProductionId` and preserves the sub-route.
 * - On global/dashboard routes (`/[tenant]`, `/[tenant]/box-office`, `/[tenant]/reports`,
 *   `/[tenant]/production`, etc.), stays on that route (with `/${tenant}` preserved)
 *   so the server re-renders using the updated `active_production_id` cookie.
 */
export function resolveShowSwitchPath(
  currentPath: string,
  tenant: string,
  targetProductionId: number
): string {
  const cleanTenant = tenant.trim().replace(/^\/+|\/+$/g, "");
  const normalizedPath = (currentPath || "/").trim() || "/";

  // Match either `/[tenant]/production/[id]/...` or `/production/[id]/...`
  const prodMatch = normalizedPath.match(
    /^(?:\/([^/]+))?\/production\/(\d+)(\/.*)?$/
  );

  if (prodMatch) {
    const matchedTenant = prodMatch[1];
    const suffix = prodMatch[3] || "";
    const resolvedTenant = cleanTenant || matchedTenant || "";
    return resolvedTenant
      ? `/${resolvedTenant}/production/${targetProductionId}${suffix}`
      : `/production/${targetProductionId}${suffix}`;
  }

  // Ensure tenant prefix is preserved on non-production routes
  if (cleanTenant) {
    if (normalizedPath === "/" || normalizedPath === `/${cleanTenant}`) {
      return `/${cleanTenant}`;
    }
    if (normalizedPath.startsWith(`/${cleanTenant}/`)) {
      return normalizedPath;
    }
    return `/${cleanTenant}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
  }

  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
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
