import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";

export interface PersonCredit {
  productionId: number;
  productionTitle: string;
  season: string;
  status: string;
  roleName: string;
}

export interface PersonClassCredit {
  classId: number;
  title: string;
  session: string;
}

export interface PersonProfileData {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  secondaryEmail: string;
  phone: string;
  headshotUrl: string | null;
  roles: string[];
  bio: string;
  city: string;
  state: string;
  dateOfBirth: string;
  heightInches: number | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  crewCredits: PersonCredit[];
  castCredits: PersonCredit[];
  classesTaught: PersonClassCredit[];
}

function extId(row: { id: number; baserowId: number | null }): number {
  return row.baserowId ?? row.id;
}

function normName(s: string | null | undefined): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function personMatchesName(
  row: { fullName: string; firstName: string; lastName: string },
  expectedName: string
): boolean {
  const target = normName(expectedName);
  if (!target) return true;
  const full = normName(row.fullName || `${row.firstName} ${row.lastName}`);
  const combined = normName(`${row.firstName} ${row.lastName}`);
  return full === target || combined === target;
}

export async function getPersonProfilePg(
  tenantSlug: string,
  lookup: { personId?: number | null; name?: string | null; email?: string | null },
  includePrivateFields: boolean
): Promise<PersonProfileData | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  let person: typeof schema.people.$inferSelect | undefined;

  // 1. Lookup by internal/external ID (disambiguating id vs baserowId collisions using lookup.name)
  if (lookup.personId && Number.isInteger(lookup.personId) && lookup.personId > 0) {
    const idCandidates = await db
      .select()
      .from(schema.people)
      .where(
        and(
          eq(schema.people.organizationId, org.id),
          or(
            eq(schema.people.id, lookup.personId),
            eq(schema.people.baserowId, lookup.personId)
          )
        )
      )
      .limit(5);

    if (idCandidates.length > 0) {
      if (lookup.name?.trim()) {
        // Prefer exact name match among ID candidates (prevents id/baserowId cross-person collision)
        const nameMatched =
          idCandidates.find(
            (r) => r.id === lookup.personId && personMatchesName(r, lookup.name!)
          ) || idCandidates.find((r) => personMatchesName(r, lookup.name!));
        if (nameMatched) {
          person = nameMatched;
        }
      } else {
        person =
          idCandidates.find((r) => r.id === lookup.personId) || idCandidates[0];
      }
    }
  }

  // 2. Fallback lookup by email
  if (!person && lookup.email?.trim()) {
    const cleanEmail = lookup.email.trim().toLowerCase();
    const [byEmail] = await db
      .select()
      .from(schema.people)
      .where(
        and(
          eq(schema.people.organizationId, org.id),
          or(
            ilike(schema.people.email, cleanEmail),
            ilike(schema.people.secondaryEmail, cleanEmail)
          )
        )
      )
      .limit(1);
    person = byEmail;
  }

  // 3. Fallback lookup by full name (case-insensitive)
  if (!person && lookup.name?.trim()) {
    const cleanName = lookup.name.trim();
    const [byName] = await db
      .select()
      .from(schema.people)
      .where(
        and(
          eq(schema.people.organizationId, org.id),
          ilike(schema.people.fullName, cleanName)
        )
      )
      .limit(1);
    person = byName;
  }

  if (!person) return null;

  const [crewRows, castRows, classRows] = await Promise.all([
    db
      .select({
        prodId: schema.productions.id,
        prodBaserowId: schema.productions.baserowId,
        prodTitle: schema.productions.title,
        prodStatus: schema.productions.status,
        prodSession: schema.productions.sessionLabel,
        seasonName: schema.seasons.name,
        positionName: schema.staffPositions.roleName,
      })
      .from(schema.showTeam)
      .innerJoin(schema.productions, eq(schema.showTeam.productionId, schema.productions.id))
      .leftJoin(schema.seasons, eq(schema.productions.seasonId, schema.seasons.id))
      .leftJoin(schema.staffPositions, eq(schema.showTeam.positionId, schema.staffPositions.id))
      .where(
        and(
          eq(schema.showTeam.organizationId, org.id),
          eq(schema.showTeam.personId, person.id)
        )
      )
      .orderBy(desc(sql`COALESCE(${schema.productions.baserowId}, ${schema.productions.id})`)),

    db
      .select({
        prodId: schema.productions.id,
        prodBaserowId: schema.productions.baserowId,
        prodTitle: schema.productions.title,
        prodStatus: schema.productions.status,
        prodSession: schema.productions.sessionLabel,
        seasonName: schema.seasons.name,
        roleName: schema.blueprintRoles.roleName,
      })
      .from(schema.assignments)
      .innerJoin(schema.productions, eq(schema.assignments.productionId, schema.productions.id))
      .leftJoin(schema.seasons, eq(schema.productions.seasonId, schema.seasons.id))
      .leftJoin(schema.blueprintRoles, eq(schema.assignments.roleId, schema.blueprintRoles.id))
      .where(
        and(
          eq(schema.assignments.organizationId, org.id),
          eq(schema.assignments.personId, person.id)
        )
      )
      .orderBy(desc(sql`COALESCE(${schema.productions.baserowId}, ${schema.productions.id})`)),

    db
      .select({
        id: schema.classes.id,
        baserowId: schema.classes.baserowId,
        title: schema.classes.className,
        session: schema.sessions.name,
      })
      .from(schema.classes)
      .leftJoin(schema.sessions, eq(schema.classes.sessionId, schema.sessions.id))
      .where(
        and(
          eq(schema.classes.organizationId, org.id),
          eq(schema.classes.teacherId, person.id)
        )
      )
      .orderBy(desc(schema.classes.id))
      .limit(12),
  ]);

  const displayName =
    person.fullName?.trim() ||
    `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
    "Unnamed Person";

  return {
    id: extId(person),
    name: displayName,
    firstName: person.firstName || "",
    lastName: person.lastName || "",
    email: person.email || "",
    secondaryEmail: includePrivateFields ? person.secondaryEmail || "" : "",
    phone: includePrivateFields ? person.phone || "" : "",
    headshotUrl: person.headshotUrl || null,
    roles: Array.isArray(person.roles) ? person.roles : [],
    bio: person.editedBio || "",
    city: includePrivateFields ? person.city || "" : "",
    state: includePrivateFields ? person.state || "" : "",
    dateOfBirth: includePrivateFields ? person.dateOfBirth || "" : "",
    heightInches: person.heightInches ?? null,
    emergencyContactName: includePrivateFields ? person.emergencyContactName || "" : "",
    emergencyContactPhone: includePrivateFields ? person.emergencyContactPhone || "" : "",
    crewCredits: crewRows.map((r) => ({
      productionId: r.prodBaserowId ?? r.prodId,
      productionTitle: r.prodTitle || "Untitled Show",
      season: r.seasonName || r.prodSession || "",
      status: r.prodStatus || "",
      roleName: r.positionName || "Staff",
    })),
    castCredits: castRows.map((r) => ({
      productionId: r.prodBaserowId ?? r.prodId,
      productionTitle: r.prodTitle || "Untitled Show",
      season: r.seasonName || r.prodSession || "",
      status: r.prodStatus || "",
      roleName: r.roleName || "Cast",
    })),
    classesTaught: classRows.map((c) => ({
      classId: extId(c),
      title: c.title || "Class",
      session: c.session || "",
    })),
  };
}
