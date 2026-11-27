// app/lib/db/audition-panel-repo.ts
// Multi-tenant PostgreSQL repository for the 3-6 judge Auditions & Callbacks workflow,
// video persistence, full student dossiers (bios, conflicts, show history), and consensus scoring.

import { and, asc, eq, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOrganizationBySlugPg } from "./core-repo";
import { computeAgeFromDob, formatHeightFromInches } from "./role-helpers";
import {
  clampScore,
  computePanelConsensus,
  normalizeCallbackVote,
  normalizeRound,
  normalizeVideoKind,
  parseFormConflictsFromNotes,
  type AuditionRound,
  type CallbackVote,
  type JudgeBallot,
  type PanelConsensus,
  type VideoKind,
} from "../audition-workflow-helpers";

function extId(row: { id: number; baserowId: number | null }): number {
  return row.baserowId ?? row.id;
}

async function resolveProduction(orgId: number, externalId: number) {
  const db = getDb();
  const [prod] = await db
    .select()
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, orgId),
        or(eq(schema.productions.baserowId, externalId), eq(schema.productions.id, externalId))
      )
    )
    .limit(1);
  return prod ?? null;
}

async function resolveAudition(orgId: number, externalId: number) {
  const db = getDb();
  const [aud] = await db
    .select()
    .from(schema.auditions)
    .where(
      and(
        eq(schema.auditions.organizationId, orgId),
        or(eq(schema.auditions.baserowId, externalId), eq(schema.auditions.id, externalId))
      )
    )
    .limit(1);
  return aud ?? null;
}

export interface AuditionDeckPerformer {
  id: number;
  originalId: number;
  performerId: number | null;
  auditionNumber: string;
  name: string;
  preferredName: string;
  avatar: string | null;
  age: string;
  grade: string;
  height: string;
  hairColor: string;
  dob: string;
  voiceType: string;
  vocalRange: string;
  song: string;
  monologue: string;
  backingTrack: string;
  preferredRoles: string;
  acceptAnyRole: boolean;
  stageRomance: boolean;
  willingToAlterAppearance: boolean;
  fearOfHeights: boolean;
  otherTalents: string;
  programBio: string;
  priorExperience: string;
  medicalNotes: string;
  conflicts: string;
  conflictsList: string[];
  pastRoles: string[];
  status: string;
  callbackStatus: string;
  isCalledBack: boolean;
  timeSlot: string;
  slotId: number | null;
  session: "Scheduled" | "Video/Remote" | "Walk-In";
  isWalkIn: boolean;
  isCheckedIn: boolean;
  lobbyNote: string;
  // Videos (all 3 persisted in Neon)
  video: string | null; // primary preview video (audition -> dance -> callback)
  auditionVideoUrl: string | null;
  danceVideoUrl: string | null;
  callbackVideoUrl: string | null;
  // Panel & legacy scores
  vocal: number;
  acting: number;
  dance: number;
  presence: number;
  actingNotes: string;
  musicNotes: string;
  choreoNotes: string;
  dropInNotes: string;
  adminNotes: string;
  ballots: JudgeBallot[];
  auditionConsensus: PanelConsensus;
  callbackConsensus: PanelConsensus;
}

export async function getAuditionDeckDataPg(
  tenantSlug: string,
  productionId: number,
  options?: { callbacksOnly?: boolean }
): Promise<{
  performers: AuditionDeckPerformer[];
  blueprintRoles: string[];
  slotLabels: string[];
} | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const prod = await resolveProduction(org.id, productionId);
  if (!prod) return { performers: [], blueprintRoles: [], slotLabels: [] };

  const db = getDb();

  const [
    audRows,
    slotRows,
    ballotRows,
    conflictRows,
    bioRows,
    roleRows,
    allAssignments,
    allProds,
    allRolesForHistory,
  ] = await Promise.all([
    db
      .select({
        aud: schema.auditions,
        person: schema.people,
      })
      .from(schema.auditions)
      .leftJoin(schema.people, eq(schema.auditions.performerId, schema.people.id))
      .where(
        and(
          eq(schema.auditions.organizationId, org.id),
          eq(schema.auditions.productionId, prod.id)
        )
      )
      .orderBy(asc(schema.auditions.id)),
    db
      .select()
      .from(schema.auditionSlots)
      .where(
        and(
          eq(schema.auditionSlots.organizationId, org.id),
          eq(schema.auditionSlots.productionId, prod.id)
        )
      )
      .orderBy(asc(schema.auditionSlots.id)),
    db
      .select()
      .from(schema.auditionJudgeScores)
      .where(
        and(
          eq(schema.auditionJudgeScores.organizationId, org.id),
          eq(schema.auditionJudgeScores.productionId, prod.id)
        )
      )
      .orderBy(asc(schema.auditionJudgeScores.id)),
    db
      .select({
        conflict: schema.conflicts,
        eventName: schema.events.eventType,
        eventDate: schema.events.eventDate,
      })
      .from(schema.conflicts)
      .leftJoin(schema.events, eq(schema.conflicts.eventId, schema.events.id))
      .where(
        and(
          eq(schema.conflicts.organizationId, org.id),
          eq(schema.conflicts.productionId, prod.id)
        )
      ),
    db
      .select()
      .from(schema.studentBios)
      .where(eq(schema.studentBios.organizationId, org.id)),
    prod.masterShowId
      ? db
          .select()
          .from(schema.blueprintRoles)
          .where(
            and(
              eq(schema.blueprintRoles.organizationId, org.id),
              eq(schema.blueprintRoles.masterShowId, prod.masterShowId)
            )
          )
          .orderBy(asc(schema.blueprintRoles.roleName))
      : db
          .select()
          .from(schema.blueprintRoles)
          .where(eq(schema.blueprintRoles.organizationId, org.id))
          .orderBy(asc(schema.blueprintRoles.roleName)),
    db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.organizationId, org.id)),
    db
      .select({ id: schema.productions.id, title: schema.productions.title })
      .from(schema.productions)
      .where(eq(schema.productions.organizationId, org.id)),
    db
      .select({ id: schema.blueprintRoles.id, roleName: schema.blueprintRoles.roleName })
      .from(schema.blueprintRoles)
      .where(eq(schema.blueprintRoles.organizationId, org.id)),
  ]);

  const slotMap = new Map(slotRows.map((s) => [s.id, s]));
  const prodTitleMap = new Map(allProds.map((p) => [p.id, p.title]));
  const roleNameMap = new Map(allRolesForHistory.map((r) => [r.id, r.roleName]));

  // Group judge ballots by internal auditionId
  const ballotsByAudition = new Map<number, JudgeBallot[]>();
  for (const row of ballotRows) {
    const list = ballotsByAudition.get(row.auditionId) || [];
    list.push({
      id: row.id,
      judgeEmail: row.judgeEmail,
      judgeName: row.judgeName,
      judgeRole: row.judgeRole || "Judge",
      round: normalizeRound(row.round),
      vocalScore: row.vocalScore ?? null,
      actingScore: row.actingScore ?? null,
      danceScore: row.danceScore ?? null,
      stagePresenceScore: row.stagePresenceScore ?? null,
      callbackVote: normalizeCallbackVote(row.callbackVote),
      suggestedRoles: row.suggestedRoles || "",
      notes: row.notes || "",
      updatedAt: row.updatedAt?.toISOString(),
    });
    ballotsByAudition.set(row.auditionId, list);
  }

  // Group conflicts by internal personId
  const conflictsByPerson = new Map<number, string[]>();
  for (const row of conflictRows) {
    const c = row.conflict;
    if (!c.personId) continue;
    const list = conflictsByPerson.get(c.personId) || [];
    const when = [row.eventDate, row.eventName].filter(Boolean).join(" ");
    const parts = [when, c.conflictType, c.notes].filter(Boolean);
    if (parts.length > 0) list.push(parts.join(" — "));
    conflictsByPerson.set(c.personId, list);
  }

  // Latest student bio by internal personId
  const bioByPerson = new Map<number, (typeof bioRows)[number]>();
  for (const b of bioRows) {
    if (!b.personId) continue;
    const existing = bioByPerson.get(b.personId);
    if (!existing || b.productionId === prod.id || b.id > existing.id) {
      bioByPerson.set(b.personId, b);
    }
  }

  // Past roles by internal personId (excluding current production if uncast, or showing all past shows)
  const historyByPerson = new Map<number, string[]>();
  for (const a of allAssignments) {
    if (!a.personId || !a.roleId) continue;
    if (a.productionId === prod.id) continue;
    const roleName = roleNameMap.get(a.roleId);
    const showName = a.productionId ? prodTitleMap.get(a.productionId) : null;
    if (!roleName) continue;
    const label = showName ? `${roleName} (${showName})` : roleName;
    const list = historyByPerson.get(a.personId) || [];
    if (!list.includes(label)) list.push(label);
    historyByPerson.set(a.personId, list);
  }

  let performers: AuditionDeckPerformer[] = audRows.map(({ aud, person }) => {
    const performerName =
      person?.fullName?.trim() ||
      `${person?.firstName || ""} ${person?.lastName || ""}`.trim() ||
      "Unknown Actor";
    const performerExtId = person ? extId(person) : null;

    let avatarUrl = person?.headshotUrl || "";
    if (!avatarUrl || !avatarUrl.startsWith("http")) {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(performerName)}&background=27272a&color=60a5fa`;
    }

    const slot = aud.slotId ? slotMap.get(aud.slotId) : null;
    const rawTimeSlot = slot?.timeLabel || (aud.status === "Walk-In" ? "WALK-IN" : "Unscheduled");

    let session: "Scheduled" | "Video/Remote" | "Walk-In" = "Scheduled";
    if (aud.status === "Walk-In" || rawTimeSlot === "WALK-IN") {
      session = "Walk-In";
    } else if (aud.auditionVideoUrl && rawTimeSlot === "Unscheduled") {
      session = "Video/Remote";
    }

    const ballots = ballotsByAudition.get(aud.id) || [];
    const auditionConsensus = computePanelConsensus(ballots, "audition");
    const callbackConsensus = computePanelConsensus(ballots, "callback");

    const dbConflicts = person ? conflictsByPerson.get(person.id) || [] : [];
    const formConflicts = parseFormConflictsFromNotes(aud.adminNotes);
    const mergedConflicts = Array.from(new Set([...dbConflicts, ...formConflicts]));

    const studentBio = person ? bioByPerson.get(person.id) : undefined;
    const pastRoles = person ? historyByPerson.get(person.id) || [] : [];
    const age = computeAgeFromDob(person?.dateOfBirth || null);

    const status = aud.status || "Pending";
    const isCalledBack =
      status.toLowerCase() === "called back" ||
      Boolean(aud.callbackStatus && aud.callbackStatus.trim().length > 0 && status.toLowerCase() !== "dropped");

    const primaryVideo = aud.auditionVideoUrl || aud.danceVideoUrl || aud.callbackVideoUrl || null;

    return {
      id: extId(aud),
      originalId: extId(aud),
      performerId: performerExtId,
      auditionNumber: aud.auditionNumber || "",
      name: performerName,
      preferredName: studentBio?.preferredName || "",
      avatar: avatarUrl,
      age: age > 0 ? String(age) : "?",
      grade: aud.grade || "",
      height: formatHeightFromInches(person?.heightInches ?? null) || "N/A",
      hairColor: aud.hairColor || "",
      dob: person?.dateOfBirth || "",
      voiceType: aud.voiceType || "",
      vocalRange: aud.vocalRange || aud.voiceType || "",
      song: aud.song || "",
      monologue: aud.monologue || "",
      backingTrack: aud.backingTrackUrl || "",
      preferredRoles: aud.preferredRoles || "",
      acceptAnyRole: Boolean(aud.acceptAnyRole),
      stageRomance: Boolean(aud.stageRomance),
      willingToAlterAppearance: Boolean(aud.willingToAlterAppearance),
      fearOfHeights: Boolean(aud.fearOfHeights),
      otherTalents: aud.otherTalents || "",
      programBio: aud.programBio || "",
      priorExperience: studentBio?.priorExperience || "",
      medicalNotes: person?.medicalNotes || studentBio?.medicalNotes || "",
      conflicts: mergedConflicts.join(", "),
      conflictsList: mergedConflicts,
      pastRoles,
      status,
      callbackStatus: aud.callbackStatus || "",
      isCalledBack,
      timeSlot: rawTimeSlot,
      slotId: slot ? extId(slot) : null,
      session,
      isWalkIn: session === "Walk-In",
      isCheckedIn: Boolean(aud.checkedIn) || session === "Walk-In",
      lobbyNote: aud.lobbyNote || "",
      video: primaryVideo,
      auditionVideoUrl: aud.auditionVideoUrl || null,
      danceVideoUrl: aud.danceVideoUrl || null,
      callbackVideoUrl: aud.callbackVideoUrl || null,
      vocal: auditionConsensus.avgVocal || Number(aud.vocalScore ?? 0),
      acting: auditionConsensus.avgActing || Number(aud.actingScore ?? 0),
      dance: auditionConsensus.avgDance || Number(aud.danceScore ?? 0),
      presence: auditionConsensus.avgPresence || Number(aud.stagePresenceScore ?? 0),
      actingNotes: aud.actingNotes || "",
      musicNotes: aud.musicNotes || "",
      choreoNotes: aud.choreographyNotes || "",
      dropInNotes: aud.dropInNotes || "",
      adminNotes: aud.adminNotes || "",
      ballots,
      auditionConsensus,
      callbackConsensus,
    };
  });

  if (options?.callbacksOnly) {
    performers = performers.filter((p) => p.isCalledBack);
  }

  return {
    performers,
    blueprintRoles: roleRows.map((r) => r.roleName),
    slotLabels: slotRows.map((s) => s.timeLabel),
  };
}

export async function saveJudgeBallotPg(
  tenantSlug: string,
  productionId: number,
  auditionId: number,
  judge: { email: string; name: string; role: string; personId?: number | null },
  input: {
    round?: AuditionRound;
    vocalScore?: number | null;
    actingScore?: number | null;
    danceScore?: number | null;
    stagePresenceScore?: number | null;
    callbackVote?: string | null;
    suggestedRoles?: string;
    notes?: string;
  }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const [prod, aud] = await Promise.all([
    resolveProduction(org.id, productionId),
    resolveAudition(org.id, auditionId),
  ]);
  if (!prod || !aud) return { success: false as const, error: "Audition or production not found." };

  const cleanEmail = (judge.email || "").trim().toLowerCase();
  if (!cleanEmail) return { success: false as const, error: "Judge email is required." };

  const round = normalizeRound(input.round);
  const vocalScore = clampScore(input.vocalScore);
  const actingScore = clampScore(input.actingScore);
  const danceScore = clampScore(input.danceScore);
  const stagePresenceScore = clampScore(input.stagePresenceScore);
  const callbackVote: CallbackVote | null = normalizeCallbackVote(input.callbackVote);
  const suggestedRoles = (input.suggestedRoles || "").trim();
  const notes = (input.notes || "").trim();

  const db = getDb();

  // Resolve optional judge personId inside this org
  let internalJudgePersonId: number | null = null;
  const [judgePerson] = await db
    .select({ id: schema.people.id })
    .from(schema.people)
    .where(and(eq(schema.people.organizationId, org.id), eq(schema.people.email, cleanEmail)))
    .limit(1);
  if (judgePerson) internalJudgePersonId = judgePerson.id;

  const [existing] = await db
    .select()
    .from(schema.auditionJudgeScores)
    .where(
      and(
        eq(schema.auditionJudgeScores.organizationId, org.id),
        eq(schema.auditionJudgeScores.auditionId, aud.id),
        eq(schema.auditionJudgeScores.judgeEmail, cleanEmail),
        eq(schema.auditionJudgeScores.round, round)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.auditionJudgeScores)
      .set({
        judgeName: judge.name || existing.judgeName,
        judgeRole: judge.role || existing.judgeRole,
        judgePersonId: internalJudgePersonId ?? existing.judgePersonId,
        vocalScore,
        actingScore,
        danceScore,
        stagePresenceScore,
        callbackVote,
        suggestedRoles,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(schema.auditionJudgeScores.id, existing.id));
  } else {
    await db.insert(schema.auditionJudgeScores).values({
      organizationId: org.id,
      productionId: prod.id,
      auditionId: aud.id,
      judgePersonId: internalJudgePersonId,
      judgeEmail: cleanEmail,
      judgeName: judge.name || cleanEmail,
      judgeRole: judge.role || "Judge",
      round,
      vocalScore,
      actingScore,
      danceScore,
      stagePresenceScore,
      callbackVote,
      suggestedRoles,
      notes,
    });
  }

  // Recompute panel consensus for this audition and sync summary columns on `auditions`
  const allBallotsRaw = await db
    .select()
    .from(schema.auditionJudgeScores)
    .where(
      and(
        eq(schema.auditionJudgeScores.organizationId, org.id),
        eq(schema.auditionJudgeScores.auditionId, aud.id)
      )
    );

  const ballots: JudgeBallot[] = allBallotsRaw.map((row) => ({
    id: row.id,
    judgeEmail: row.judgeEmail,
    judgeName: row.judgeName,
    judgeRole: row.judgeRole || "Judge",
    round: normalizeRound(row.round),
    vocalScore: row.vocalScore ?? null,
    actingScore: row.actingScore ?? null,
    danceScore: row.danceScore ?? null,
    stagePresenceScore: row.stagePresenceScore ?? null,
    callbackVote: normalizeCallbackVote(row.callbackVote),
    suggestedRoles: row.suggestedRoles || "",
    notes: row.notes || "",
    updatedAt: row.updatedAt?.toISOString(),
  }));

  const auditionConsensus = computePanelConsensus(ballots, "audition");
  const callbackConsensus = computePanelConsensus(ballots, "callback");

  if (round === "audition") {
    const audUpdates: Partial<typeof schema.auditions.$inferInsert> = {
      vocalScore: auditionConsensus.avgVocal || null,
      actingScore: auditionConsensus.avgActing || null,
      danceScore: auditionConsensus.avgDance || null,
      stagePresenceScore: auditionConsensus.avgPresence || null,
      updatedAt: new Date(),
    };

    // Keep legacy role-specific notes synced for backwards compatibility with Casting Board
    const lowerRole = (judge.role || "").toLowerCase();
    if (notes) {
      if (lowerRole.includes("music") || lowerRole.includes("vocal")) {
        audUpdates.musicNotes = notes;
      } else if (lowerRole.includes("choreo") || lowerRole.includes("dance")) {
        audUpdates.choreographyNotes = notes;
      } else if (lowerRole.includes("director")) {
        audUpdates.actingNotes = notes;
      } else {
        audUpdates.dropInNotes = notes;
      }
    }

    await db.update(schema.auditions).set(audUpdates).where(eq(schema.auditions.id, aud.id));
  }

  return {
    success: true as const,
    ballots,
    auditionConsensus,
    callbackConsensus,
  };
}

export async function saveAuditionVideoPg(
  tenantSlug: string,
  auditionId: number,
  videoKind: VideoKind,
  videoUrl: string | null
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { success: false as const, error: "Audition not found." };

  const kind = normalizeVideoKind(videoKind);
  const cleanUrl = videoUrl && videoUrl.trim() ? videoUrl.trim() : null;
  const updates: Partial<typeof schema.auditions.$inferInsert> = { updatedAt: new Date() };

  if (kind === "dance") updates.danceVideoUrl = cleanUrl;
  else if (kind === "callback") updates.callbackVideoUrl = cleanUrl;
  else updates.auditionVideoUrl = cleanUrl;

  const db = getDb();
  await db.update(schema.auditions).set(updates).where(eq(schema.auditions.id, aud.id));

  return { success: true as const, videoKind: kind, videoUrl: cleanUrl };
}

export async function saveGroupDanceVideoPg(
  tenantSlug: string,
  auditionIds: number[],
  videoUrl: string | null
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };
  if (!auditionIds.length) return { success: false as const, error: "No auditions selected." };

  const db = getDb();
  const rows = await db
    .select({ id: schema.auditions.id })
    .from(schema.auditions)
    .where(
      and(
        eq(schema.auditions.organizationId, org.id),
        or(
          inArray(schema.auditions.baserowId, auditionIds),
          inArray(schema.auditions.id, auditionIds)
        )
      )
    );

  if (!rows.length) return { success: false as const, error: "Matching auditions not found." };

  const cleanUrl = videoUrl && videoUrl.trim() ? videoUrl.trim() : null;
  await db
    .update(schema.auditions)
    .set({ danceVideoUrl: cleanUrl, updatedAt: new Date() })
    .where(
      and(
        eq(schema.auditions.organizationId, org.id),
        inArray(
          schema.auditions.id,
          rows.map((r) => r.id)
        )
      )
    );

  return { success: true as const, updatedCount: rows.length, videoUrl: cleanUrl };
}

export async function updateCallbackStatusPg(
  tenantSlug: string,
  auditionId: number,
  isCalledBack: boolean,
  callbackGroup?: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { success: false as const, error: "Audition not found." };

  const nextStatus = isCalledBack ? "Called Back" : aud.checkedIn ? "Checked In" : "Pending";
  const nextGroup =
    callbackGroup !== undefined
      ? callbackGroup.trim()
      : isCalledBack
      ? aud.callbackStatus || ""
      : "";

  const db = getDb();
  await db
    .update(schema.auditions)
    .set({
      status: nextStatus,
      callbackStatus: nextGroup,
      updatedAt: new Date(),
    })
    .where(eq(schema.auditions.id, aud.id));

  return { success: true as const, status: nextStatus, callbackStatus: nextGroup };
}

export async function updateAuditionSlotLegacyPg(
  tenantSlug: string,
  auditionId: number,
  payload: Record<string, unknown>
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { error: true, details: "Organization not found." };

  const aud = await resolveAudition(org.id, auditionId);
  if (!aud) return { error: true, details: "Audition not found." };

  const updates: Partial<typeof schema.auditions.$inferInsert> = { updatedAt: new Date() };
  if ("Vocal Score" in payload) updates.vocalScore = clampScore(payload["Vocal Score"]);
  if ("Acting Score" in payload) updates.actingScore = clampScore(payload["Acting Score"]);
  if ("Dance Score" in payload) updates.danceScore = clampScore(payload["Dance Score"]);
  if ("Stage Presence Score" in payload) {
    updates.stagePresenceScore = clampScore(payload["Stage Presence Score"]);
  }
  if ("Acting Notes" in payload) updates.actingNotes = String(payload["Acting Notes"] || "");
  if ("Music Notes" in payload) updates.musicNotes = String(payload["Music Notes"] || "");
  if ("Choreography Notes" in payload) {
    updates.choreographyNotes = String(payload["Choreography Notes"] || "");
  }
  if ("Drop-In Notes" in payload) updates.dropInNotes = String(payload["Drop-In Notes"] || "");
  if ("Admin Notes" in payload) updates.adminNotes = String(payload["Admin Notes"] || "");
  if ("Dance Video" in payload) {
    updates.danceVideoUrl = String(payload["Dance Video"] || "").trim() || null;
  }
  if ("Audition Video" in payload) {
    updates.auditionVideoUrl = String(payload["Audition Video"] || "").trim() || null;
  }
  if ("Callback Video" in payload) {
    updates.callbackVideoUrl = String(payload["Callback Video"] || "").trim() || null;
  }

  const db = getDb();
  const [updated] = await db
    .update(schema.auditions)
    .set(updates)
    .where(eq(schema.auditions.id, aud.id))
    .returning();
  return updated;
}
