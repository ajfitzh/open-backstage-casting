import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";
import { sortShowsBySession } from "@/app/lib/show-switcher-helpers";

export interface ArchiveShowSummary {
  id: number;
  title: string;
  season: string;
  productionSession: string;
  status: string;
  type: string;
  venue: string;
  image: string | null;
  openingNight: string | null;
  closingNight: string | null;
  castCount: number;
  crewCount: number;
  photoCount: number;
}

export interface ArchiveSeasonGroup {
  season: string;
  status: string;
  shows: ArchiveShowSummary[];
}

export interface PublicArchiveData {
  orgName: string;
  orgSlug: string;
  totalShows: number;
  totalSeasons: number;
  totalPlaybills: number;
  seasons: ArchiveSeasonGroup[];
}

export interface PublicShowDetail {
  id: number;
  title: string;
  season: string;
  session: string;
  venue: string;
  image: string | null;
  openingNight: string | null;
  closingNight: string | null;
  cast: { name: string; role: string }[];
  crew: { name: string; role: string }[];
  gallery: { id: number; name: string; url: string; type: string }[];
}

export async function getPublicShowArchivePg(
  tenantSlug: string
): Promise<PublicArchiveData | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [prodRows, castCounts, crewCounts, assetCounts] = await Promise.all([
    db
      .select({
        prod: schema.productions,
        seasonName: schema.seasons.name,
        seasonStatus: schema.seasons.status,
        venueName: schema.venues.name,
      })
      .from(schema.productions)
      .leftJoin(schema.seasons, eq(schema.productions.seasonId, schema.seasons.id))
      .leftJoin(schema.venues, eq(schema.productions.venueId, schema.venues.id))
      .where(eq(schema.productions.organizationId, org.id))
      .orderBy(desc(schema.productions.id)),

    db
      .select({
        productionId: schema.assignments.productionId,
        count: sql<number>`count(distinct ${schema.assignments.personId})::int`,
      })
      .from(schema.assignments)
      .where(eq(schema.assignments.organizationId, org.id))
      .groupBy(schema.assignments.productionId),

    db
      .select({
        productionId: schema.showTeam.productionId,
        count: sql<number>`count(distinct ${schema.showTeam.personId})::int`,
      })
      .from(schema.showTeam)
      .where(eq(schema.showTeam.organizationId, org.id))
      .groupBy(schema.showTeam.productionId),

    db
      .select({
        productionId: schema.assets.productionId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.assets)
      .where(eq(schema.assets.organizationId, org.id))
      .groupBy(schema.assets.productionId),
  ]);

  const castMap = new Map(
    castCounts.filter((c) => c.productionId != null).map((c) => [c.productionId!, c.count])
  );
  const crewMap = new Map(
    crewCounts.filter((c) => c.productionId != null).map((c) => [c.productionId!, c.count])
  );
  const assetMap = new Map(
    assetCounts.filter((c) => c.productionId != null).map((c) => [c.productionId!, c.count])
  );

  const bySeason = new Map<string, { status: string; shows: ArchiveShowSummary[] }>();
  let totalPlaybills = 0;

  for (const row of prodRows) {
    const season = row.seasonName || "Other";
    if (!bySeason.has(season)) {
      bySeason.set(season, { status: row.seasonStatus || "Archived", shows: [] });
    }
    if (row.prod.showImageUrl) totalPlaybills++;

    bySeason.get(season)!.shows.push({
      id: row.prod.id,
      title: row.prod.title,
      season,
      productionSession: row.prod.sessionLabel || "",
      status: row.prod.status || "Archived",
      type: row.prod.type || "Main Stage",
      venue: row.venueName || row.prod.location || "",
      image: row.prod.showImageUrl || null,
      openingNight: row.prod.openingNight || null,
      closingNight: row.prod.closingNight || null,
      castCount: castMap.get(row.prod.id) || 0,
      crewCount: crewMap.get(row.prod.id) || 0,
      photoCount: assetMap.get(row.prod.id) || (row.prod.showImageUrl ? 1 : 0),
    });
  }

  const seasons: ArchiveSeasonGroup[] = Array.from(bySeason.entries())
    .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))
    .map(([season, data]) => ({
      season,
      status: data.status,
      shows: sortShowsBySession(data.shows),
    }));

  return {
    orgName: org.name,
    orgSlug: org.slug,
    totalShows: prodRows.length,
    totalSeasons: seasons.length,
    totalPlaybills,
    seasons,
  };
}

export async function getPublicShowDetailPg(
  tenantSlug: string,
  productionId: number
): Promise<PublicShowDetail | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [prodRow] = await db
    .select({
      prod: schema.productions,
      seasonName: schema.seasons.name,
      venueName: schema.venues.name,
    })
    .from(schema.productions)
    .leftJoin(schema.seasons, eq(schema.productions.seasonId, schema.seasons.id))
    .leftJoin(schema.venues, eq(schema.productions.venueId, schema.venues.id))
    .where(
      and(
        eq(schema.productions.organizationId, org.id),
        eq(schema.productions.id, productionId)
      )
    )
    .limit(1);

  if (!prodRow) return null;

  const [castRows, crewRows, assetRows] = await Promise.all([
    db
      .select({
        fullName: schema.people.fullName,
        firstName: schema.people.firstName,
        lastName: schema.people.lastName,
        roleName: schema.blueprintRoles.roleName,
      })
      .from(schema.assignments)
      .leftJoin(schema.people, eq(schema.assignments.personId, schema.people.id))
      .leftJoin(schema.blueprintRoles, eq(schema.assignments.roleId, schema.blueprintRoles.id))
      .where(
        and(
          eq(schema.assignments.organizationId, org.id),
          eq(schema.assignments.productionId, prodRow.prod.id)
        )
      )
      .orderBy(asc(schema.blueprintRoles.roleName), asc(schema.people.fullName)),

    db
      .select({
        fullName: schema.people.fullName,
        firstName: schema.people.firstName,
        lastName: schema.people.lastName,
        roleName: schema.staffPositions.roleName,
      })
      .from(schema.showTeam)
      .leftJoin(schema.people, eq(schema.showTeam.personId, schema.people.id))
      .leftJoin(schema.staffPositions, eq(schema.showTeam.positionId, schema.staffPositions.id))
      .where(
        and(
          eq(schema.showTeam.organizationId, org.id),
          eq(schema.showTeam.productionId, prodRow.prod.id)
        )
      )
      .orderBy(asc(schema.staffPositions.roleName), asc(schema.people.fullName)),

    db
      .select()
      .from(schema.assets)
      .where(
        and(
          eq(schema.assets.organizationId, org.id),
          eq(schema.assets.productionId, prodRow.prod.id)
        )
      ),
  ]);

  const gallery = assetRows
    .filter((a) => a.url && /^https?:\/\//i.test(a.url))
    .map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url!,
      type: a.type || "Photo",
    }));

  if (prodRow.prod.showImageUrl && !gallery.some((g) => g.url === prodRow.prod.showImageUrl)) {
    gallery.unshift({
      id: -1,
      name: `${prodRow.prod.title} — Show Poster`,
      url: prodRow.prod.showImageUrl,
      type: "Playbill",
    });
  }

  return {
    id: prodRow.prod.id,
    title: prodRow.prod.title,
    season: prodRow.seasonName || "",
    session: prodRow.prod.sessionLabel || "",
    venue: prodRow.venueName || prodRow.prod.location || "",
    image: prodRow.prod.showImageUrl || null,
    openingNight: prodRow.prod.openingNight || null,
    closingNight: prodRow.prod.closingNight || null,
    cast: castRows
      .map((r) => ({
        name: r.fullName?.trim() || `${r.firstName || ""} ${r.lastName || ""}`.trim(),
        role: r.roleName || "Cast",
      }))
      .filter((r) => Boolean(r.name)),
    crew: crewRows
      .map((r) => ({
        name: r.fullName?.trim() || `${r.firstName || ""} ${r.lastName || ""}`.trim(),
        role: r.roleName || "Production Team",
      }))
      .filter((r) => Boolean(r.name)),
    gallery,
  };
}
