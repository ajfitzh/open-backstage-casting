// app/lib/db/people-merge-repo.ts
// Lossless PostgreSQL person deduplication & merge repository.
// Re-points all 24 FK columns across 18 tables before removing the duplicate row.

import { and, eq, ilike, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";
import {
  arePeopleSafeToAutoMerge,
  buildMergedPersonFields,
  canonicalNicknameKey,
  normalizePersonName,
  pickWinningPerson,
} from "@/app/lib/people-merge-helpers";

export interface PersonMergeCandidate {
  id: number;
  fullName: string;
  email: string | null;
  secondaryEmail: string | null;
  dateOfBirth: string | null;
  headshotUrl: string | null;
  roles: string[];
  hasPassword: boolean;
  externalUserId: string | null;
  assignmentsCount: number;
  showTeamCount: number;
  auditionsCount: number;
  classesCount: number;
  totalCredits: number;
}

export interface DuplicateCluster {
  key: string;
  matchType: "exact" | "nickname";
  safeAutoMerge: boolean;
  recommendedWinnerId: number;
  people: PersonMergeCandidate[];
}

export interface MergeResult {
  success: boolean;
  error?: string;
  winnerId?: number;
  loserId?: number;
  movedCounts?: Record<string, number>;
}

async function getPersonCreditCounts(orgId: number) {
  const db = getDb();
  const res = await db.execute(sql`
    SELECT person_id,
      COALESCE(a.cnt, 0)::int AS assignments,
      COALESCE(st.cnt, 0)::int AS show_team,
      COALESCE(au.cnt, 0)::int AS auditions,
      COALESCE(cl.cnt, 0)::int AS classes_taught
    FROM (SELECT id AS person_id FROM people WHERE organization_id = ${orgId}) p
    LEFT JOIN (SELECT person_id, COUNT(*) cnt FROM assignments WHERE organization_id = ${orgId} GROUP BY person_id) a USING (person_id)
    LEFT JOIN (SELECT person_id, COUNT(*) cnt FROM show_team WHERE organization_id = ${orgId} GROUP BY person_id) st USING (person_id)
    LEFT JOIN (SELECT performer_id AS person_id, COUNT(*) cnt FROM auditions WHERE organization_id = ${orgId} GROUP BY performer_id) au USING (person_id)
    LEFT JOIN (SELECT teacher_id AS person_id, COUNT(*) cnt FROM classes WHERE organization_id = ${orgId} GROUP BY teacher_id) cl USING (person_id)
  `);
  const map = new Map<
    number,
    { assignments: number; showTeam: number; auditions: number; classes: number }
  >();
  for (const r of res.rows as any[]) {
    map.set(Number(r.person_id), {
      assignments: Number(r.assignments || 0),
      showTeam: Number(r.show_team || 0),
      auditions: Number(r.auditions || 0),
      classes: Number(r.classes_taught || 0),
    });
  }
  return map;
}

export async function findDuplicatePeopleClustersPg(
  tenantSlug: string,
  limit = 60
): Promise<DuplicateCluster[]> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return [];

  const db = getDb();
  const [allPeople, countsMap] = await Promise.all([
    db.select().from(schema.people).where(eq(schema.people.organizationId, org.id)),
    getPersonCreditCounts(org.id),
  ]);

  const toCandidate = (p: (typeof allPeople)[number]): PersonMergeCandidate => {
    const c = countsMap.get(p.id) || { assignments: 0, showTeam: 0, auditions: 0, classes: 0 };
    return {
      id: p.id,
      fullName: p.fullName || `${p.firstName} ${p.lastName}`.trim() || "Unnamed",
      email: p.email,
      secondaryEmail: p.secondaryEmail,
      dateOfBirth: p.dateOfBirth,
      headshotUrl: p.headshotUrl,
      roles: p.roles || [],
      hasPassword: Boolean(p.passwordHash),
      externalUserId: p.externalUserId,
      assignmentsCount: c.assignments,
      showTeamCount: c.showTeam,
      auditionsCount: c.auditions,
      classesCount: c.classes,
      totalCredits: c.assignments + c.showTeam + c.auditions + c.classes,
    };
  };

  // 1. Exact normalized name clusters
  const exactGroups = new Map<string, PersonMergeCandidate[]>();
  for (const p of allPeople) {
    const key = normalizePersonName(p.fullName || `${p.firstName} ${p.lastName}`);
    if (!key) continue;
    const list = exactGroups.get(key) || [];
    list.push(toCandidate(p));
    exactGroups.set(key, list);
  }

  const clusters: DuplicateCluster[] = [];
  const exactClaimedIds = new Set<number>();

  for (const [key, list] of exactGroups.entries()) {
    if (list.length < 2) continue;
    const winner = pickWinningPerson(
      list.map((c) => ({ ...c, firstName: "", lastName: "", creditsCount: c.totalCredits }))
    );
    const safeAll = list.every(
      (c) => c.id === winner.id || arePeopleSafeToAutoMerge(winner, c)
    );
    for (const c of list) exactClaimedIds.add(c.id);
    clusters.push({
      key,
      matchType: "exact",
      safeAutoMerge: safeAll,
      recommendedWinnerId: winner.id,
      people: list.sort((a, b) => (a.id === winner.id ? -1 : b.id === winner.id ? 1 : b.totalCredits - a.totalCredits)),
    });
  }

  // 2. Nickname variant clusters (e.g. Pam King / Pamela King, Mike Smith / Michael Smith)
  const nickGroups = new Map<string, PersonMergeCandidate[]>();
  for (const p of allPeople) {
    if (exactClaimedIds.has(p.id)) continue;
    const nKey = canonicalNicknameKey(p.fullName || `${p.firstName} ${p.lastName}`);
    if (!nKey || !nKey.includes(" ")) continue;
    const list = nickGroups.get(nKey) || [];
    list.push(toCandidate(p));
    nickGroups.set(nKey, list);
  }

  for (const [key, list] of nickGroups.entries()) {
    if (list.length < 2) continue;
    // Only surface nickname pairs that don't have conflicting DOBs and where at least one has credits
    const distinctDobs = new Set(list.map((c) => (c.dateOfBirth || "").trim()).filter(Boolean));
    if (distinctDobs.size > 1) continue;
    const totalClusterCredits = list.reduce((s, c) => s + c.totalCredits, 0);
    if (totalClusterCredits === 0) continue;

    const winner = pickWinningPerson(
      list.map((c) => ({ ...c, firstName: "", lastName: "", creditsCount: c.totalCredits }))
    );
    clusters.push({
      key,
      matchType: "nickname",
      safeAutoMerge: false,
      recommendedWinnerId: winner.id,
      people: list.sort((a, b) => (a.id === winner.id ? -1 : b.id === winner.id ? 1 : b.totalCredits - a.totalCredits)),
    });
  }

  return clusters
    .sort((a, b) => {
      if (a.matchType !== b.matchType) return a.matchType === "exact" ? -1 : 1;
      const aCreds = a.people.reduce((s, p) => s + p.totalCredits, 0);
      const bCreds = b.people.reduce((s, p) => s + p.totalCredits, 0);
      return bCreds - aCreds;
    })
    .slice(0, limit);
}

export async function searchPeopleForMergePg(
  tenantSlug: string,
  query: string
): Promise<PersonMergeCandidate[]> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const db = getDb();
  const pattern = `%${q}%`;
  const [rows, countsMap] = await Promise.all([
    db
      .select()
      .from(schema.people)
      .where(
        and(
          eq(schema.people.organizationId, org.id),
          or(
            ilike(schema.people.fullName, pattern),
            ilike(schema.people.email, pattern),
            ilike(schema.people.firstName, pattern),
            ilike(schema.people.lastName, pattern)
          )
        )
      )
      .limit(25),
    getPersonCreditCounts(org.id),
  ]);

  return rows
    .map((p) => {
      const c = countsMap.get(p.id) || { assignments: 0, showTeam: 0, auditions: 0, classes: 0 };
      return {
        id: p.id,
        fullName: p.fullName || `${p.firstName} ${p.lastName}`.trim() || "Unnamed",
        email: p.email,
        secondaryEmail: p.secondaryEmail,
        dateOfBirth: p.dateOfBirth,
        headshotUrl: p.headshotUrl,
        roles: p.roles || [],
        hasPassword: Boolean(p.passwordHash),
        externalUserId: p.externalUserId,
        assignmentsCount: c.assignments,
        showTeamCount: c.showTeam,
        auditionsCount: c.auditions,
        classesCount: c.classes,
        totalCredits: c.assignments + c.showTeam + c.auditions + c.classes,
      };
    })
    .sort((a, b) => b.totalCredits - a.totalCredits);
}

/**
 * Losslessly merges `loserId` into `winnerId` within the same organization:
 *  - Backfills blank profile fields & unions roles onto `winnerId`
 *  - Re-points all 24 FK columns across 18 tables (deduplicating unique conflicts)
 *  - Deletes `loserId`
 */
export async function mergePeoplePg(
  tenantSlug: string,
  winnerId: number,
  loserId: number
): Promise<MergeResult> {
  if (!Number.isInteger(winnerId) || !Number.isInteger(loserId) || winnerId <= 0 || loserId <= 0) {
    return { success: false, error: "Invalid person IDs." };
  }
  if (winnerId === loserId) {
    return { success: false, error: "Cannot merge a person with themselves." };
  }

  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false, error: "Organization not found." };

  const db = getDb();
  const [winner] = await db
    .select()
    .from(schema.people)
    .where(and(eq(schema.people.organizationId, org.id), eq(schema.people.id, winnerId)))
    .limit(1);
  const [loser] = await db
    .select()
    .from(schema.people)
    .where(and(eq(schema.people.organizationId, org.id), eq(schema.people.id, loserId)))
    .limit(1);

  if (!winner || !loser) {
    return { success: false, error: "One or both person records were not found in this organization." };
  }

  const movedCounts: Record<string, number> = {};

  // 1. Merge non-empty scalar fields & roles onto winner
  const mergedFields = buildMergedPersonFields(winner, loser);
  if (Object.keys(mergedFields).length > 0) {
    await db
      .update(schema.people)
      .set({ ...mergedFields, updatedAt: new Date() })
      .where(eq(schema.people.id, winnerId));
  }

  // 2. Deduplicate composite-unique / semantic-duplicate rows BEFORE re-pointing FKs:
  // 2a. class_enrollments: unique on (organization_id, class_id, student_id)
  await db.execute(sql`
    DELETE FROM class_enrollments
    WHERE organization_id = ${org.id}
      AND student_id = ${loserId}
      AND class_id IN (
        SELECT class_id FROM class_enrollments
        WHERE organization_id = ${org.id} AND student_id = ${winnerId}
      )
  `);
  const rClassEnr = await db.execute(sql`
    UPDATE class_enrollments SET student_id = ${winnerId}
    WHERE organization_id = ${org.id} AND student_id = ${loserId}
  `);
  movedCounts.classEnrollments = rClassEnr.rowCount ?? 0;

  // 2b. assignments: avoid exact duplicate (production_id, role_id) for same person
  await db.execute(sql`
    DELETE FROM assignments
    WHERE organization_id = ${org.id}
      AND person_id = ${loserId}
      AND role_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM assignments w
        WHERE w.organization_id = ${org.id}
          AND w.person_id = ${winnerId}
          AND w.production_id IS NOT DISTINCT FROM assignments.production_id
          AND w.role_id = assignments.role_id
      )
  `);
  const rAssign = await db.execute(sql`
    UPDATE assignments SET person_id = ${winnerId}
    WHERE organization_id = ${org.id} AND person_id = ${loserId}
  `);
  movedCounts.assignments = rAssign.rowCount ?? 0;

  // 2c. show_team: avoid exact duplicate (production_id, position_id) for same person
  await db.execute(sql`
    DELETE FROM show_team
    WHERE organization_id = ${org.id}
      AND person_id = ${loserId}
      AND EXISTS (
        SELECT 1 FROM show_team w
        WHERE w.organization_id = ${org.id}
          AND w.person_id = ${winnerId}
          AND w.production_id IS NOT DISTINCT FROM show_team.production_id
          AND w.position_id IS NOT DISTINCT FROM show_team.position_id
      )
  `);
  const rTeam = await db.execute(sql`
    UPDATE show_team SET person_id = ${winnerId}
    WHERE organization_id = ${org.id} AND person_id = ${loserId}
  `);
  movedCounts.showTeam = rTeam.rowCount ?? 0;

  // 2d. auditions: avoid duplicate (production_id, performer_id)
  await db.execute(sql`
    DELETE FROM auditions
    WHERE organization_id = ${org.id}
      AND performer_id = ${loserId}
      AND EXISTS (
        SELECT 1 FROM auditions w
        WHERE w.organization_id = ${org.id}
          AND w.performer_id = ${winnerId}
          AND w.production_id IS NOT DISTINCT FROM auditions.production_id
      )
  `);
  const rAud = await db.execute(sql`
    UPDATE auditions SET performer_id = ${winnerId}
    WHERE organization_id = ${org.id} AND performer_id = ${loserId}
  `);
  movedCounts.auditions = rAud.rowCount ?? 0;

  // 2e. audition_judge_scores: unique on (organization_id, audition_id, judge_person_id, round)
  await db.execute(sql`
    DELETE FROM audition_judge_scores
    WHERE organization_id = ${org.id}
      AND judge_person_id = ${loserId}
      AND EXISTS (
        SELECT 1 FROM audition_judge_scores w
        WHERE w.organization_id = ${org.id}
          AND w.judge_person_id = ${winnerId}
          AND w.audition_id = audition_judge_scores.audition_id
          AND w.round = audition_judge_scores.round
      )
  `);
  await db.execute(sql`
    UPDATE audition_judge_scores SET judge_person_id = ${winnerId}
    WHERE organization_id = ${org.id} AND judge_person_id = ${loserId}
  `);

  // 3. Re-point all remaining FK columns across the entire schema
  const rClasses = await db.execute(sql`
    UPDATE classes SET teacher_id = ${winnerId}
    WHERE organization_id = ${org.id} AND teacher_id = ${loserId}
  `);
  movedCounts.classesTaught = rClasses.rowCount ?? 0;

  await db.execute(sql`UPDATE signatures SET person_id = ${winnerId} WHERE organization_id = ${org.id} AND person_id = ${loserId}`);
  await db.execute(sql`UPDATE student_bios SET person_id = ${winnerId} WHERE organization_id = ${org.id} AND person_id = ${loserId}`);
  await db.execute(sql`UPDATE scene_assignments SET person_id = ${winnerId} WHERE organization_id = ${org.id} AND person_id = ${loserId}`);
  await db.execute(sql`UPDATE attendance SET person_id = ${winnerId} WHERE organization_id = ${org.id} AND person_id = ${loserId}`);
  await db.execute(sql`UPDATE attendance SET checked_in_by_id = ${winnerId} WHERE organization_id = ${org.id} AND checked_in_by_id = ${loserId}`);
  await db.execute(sql`UPDATE conflicts SET person_id = ${winnerId} WHERE organization_id = ${org.id} AND person_id = ${loserId}`);
  await db.execute(sql`UPDATE committee_prefs SET parent_person_id = ${winnerId} WHERE organization_id = ${org.id} AND parent_person_id = ${loserId}`);
  await db.execute(sql`UPDATE committee_prefs SET student_person_id = ${winnerId} WHERE organization_id = ${org.id} AND student_person_id = ${loserId}`);
  await db.execute(sql`UPDATE committee_reports SET submitter_id = ${winnerId} WHERE organization_id = ${org.id} AND submitter_id = ${loserId}`);
  await db.execute(sql`UPDATE ticket_orders SET referred_by_person_id = ${winnerId} WHERE organization_id = ${org.id} AND referred_by_person_id = ${loserId}`);
  await db.execute(sql`UPDATE staff_interest SET person_id = ${winnerId} WHERE organization_id = ${org.id} AND person_id = ${loserId}`);
  await db.execute(sql`UPDATE measurements SET person_id = ${winnerId} WHERE organization_id = ${org.id} AND person_id = ${loserId}`);
  await db.execute(sql`UPDATE garment_inventory SET assigned_person_id = ${winnerId} WHERE organization_id = ${org.id} AND assigned_person_id = ${loserId}`);
  await db.execute(sql`UPDATE tech_equipment SET assigned_person_id = ${winnerId} WHERE organization_id = ${org.id} AND assigned_person_id = ${loserId}`);
  await db.execute(sql`UPDATE password_reset_tokens SET person_id = ${winnerId} WHERE organization_id = ${org.id} AND person_id = ${loserId}`);

  // Parent links on other people (prevent self-parenting)
  await db.execute(sql`UPDATE people SET parent_1_id = CASE WHEN id = ${winnerId} THEN NULL ELSE ${winnerId}::int END WHERE organization_id = ${org.id} AND parent_1_id = ${loserId}`);
  await db.execute(sql`UPDATE people SET parent_2_id = CASE WHEN id = ${winnerId} THEN NULL ELSE ${winnerId}::int END WHERE organization_id = ${org.id} AND parent_2_id = ${loserId}`);
  await db.execute(sql`UPDATE people SET parent_3_id = CASE WHEN id = ${winnerId} THEN NULL ELSE ${winnerId}::int END WHERE organization_id = ${org.id} AND parent_3_id = ${loserId}`);

  // 4. Delete the duplicate person row
  await db
    .delete(schema.people)
    .where(and(eq(schema.people.organizationId, org.id), eq(schema.people.id, loserId)));

  return {
    success: true,
    winnerId,
    loserId,
    movedCounts,
  };
}
