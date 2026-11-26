"use server";

import { signOut } from "@/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { fetchBaserow, getDB } from "@/app/lib/baserow";
import { getTenantTableConfig } from "@/app/lib/tenant-config";
import { resolveTenant } from "@/app/lib/tenant-server";
import { requirePermission, requireStaffAccess } from "@/app/lib/auth-guard";
import { isPostgresEnabled } from "@/db";
import { generateCastingRowsPg } from "@/app/lib/db/casting-repo";
import {
  clearCastingDataPg,
  getSeasonBoardPg,
  saveCastingGridPg,
  saveScheduleBatchPg,
  toggleWorkflowTagPg,
  updateSceneLoadsPg,
  updateSceneStatusPg,
} from "@/app/lib/db/operations-repo";
import {
  claimBountyPg,
  getClassRosterPg,
  submitProposalPg,
  updateApplicantStatusPg,
  updateClassSchedulePg,
} from "@/app/lib/db/wardrobe-academy-repo";

// --- HELPERS ---

async function getTenantContext(explicitTenant?: string) {
  const tenant = await resolveTenant(explicitTenant);
  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  return { tenant, DB, tables };
}

const formatTimeHHMM = (decimal: number) => {
  const h = Math.floor(decimal);
  const m = Math.round((decimal % 1) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

export async function handleLogout() {
  await signOut({ redirectTo: "/login" });
}

export async function getSeasonBoard(seasonId: string, explicitTenant?: string) {
  try {
    const tenant = await resolveTenant(explicitTenant);
    if (isPostgresEnabled()) {
      try {
        const pgBoard = await getSeasonBoardPg(tenant, Number(seasonId));
        if (pgBoard) return pgBoard;
      } catch (error) {
        console.error("[Postgres] getSeasonBoard failed, falling back:", error);
      }
    }

    const { DB, tables } = await getTenantContext(tenant);
    const seasonsTable = tables.SEASONS || DB.SEASONS.ID;
    const staffInterestTable = tables.STAFF_INTEREST || DB.STAFF_INTEREST.ID;
    const productionsTable = tables.PRODUCTIONS || DB.PRODUCTIONS.ID;

    const seasonRes = await fetchBaserow(
      `/database/rows/table/${seasonsTable}/${seasonId}/?user_field_names=true`,
      {},
      {},
      tenant
    );

    if (!seasonRes || seasonRes.error) {
      console.error("Season Fetch Error:", seasonRes);
      return null;
    }

    const staffRes = await fetchBaserow(
      `/database/rows/table/${staffInterestTable}/`,
      {},
      {
        user_field_names: "true",
        [`filter__${DB.STAFF_INTEREST.FIELDS.SEASON}__link_row_has`]: seasonId,
      },
      tenant
    );
    const talentPool = Array.isArray(staffRes) ? staffRes : staffRes?.results || [];

    const prodRes = await fetchBaserow(
      `/database/rows/table/${productionsTable}/`,
      {},
      {
        user_field_names: "true",
        [`filter__${DB.PRODUCTIONS.FIELDS.SEASON_LINKED}__link_row_has`]: seasonId,
      },
      tenant
    );
    const productions = Array.isArray(prodRes) ? prodRes : prodRes?.results || [];

    return {
      season: seasonRes,
      talentPool,
      productions,
    };
  } catch (error) {
    console.error("Failed to load Season Board:", error);
    return null;
  }
}

// --- EDUCATION ACTIONS ---

export async function submitProposalAction(data: any, explicitTenant?: string) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const tenant = await resolveTenant(explicitTenant);
  if (isPostgresEnabled()) {
    try {
      const res = await submitProposalPg(tenant, data);
      if (res.success) revalidatePath(`/${tenant}/education/portal`);
      return res;
    } catch (error) {
      console.error("[Postgres] submitProposalAction failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(tenant);
  const sessionsTable = tables.SEASONS || DB.SESSIONS.ID;
  const peopleTable = tables.PEOPLE || DB.PEOPLE.ID;
  const classesTable = tables.CLASSES || DB.CLASSES.ID;
  const CF = DB.CLASSES.FIELDS;

  const sessionRes = await fetchBaserow(
    `/database/rows/table/${sessionsTable}/`,
    {},
    {
      user_field_names: "true",
      [`filter__${DB.SESSIONS.FIELDS.SESSION_NAME}__equal`]: data.session,
      size: "1",
    },
    tenant
  );
  const sessionId = Array.isArray(sessionRes) && sessionRes.length > 0 ? sessionRes[0].id : null;

  const teacherRes = await fetchBaserow(
    `/database/rows/table/${peopleTable}/`,
    {},
    {
      user_field_names: "true",
      [`filter__${DB.PEOPLE.FIELDS.FULL_NAME}__equal`]: data.teacher,
      size: "1",
    },
    tenant
  );
  const teacherId = Array.isArray(teacherRes) && teacherRes.length > 0 ? teacherRes[0].id : null;

  try {
    await fetchBaserow(
      `/database/rows/table/${classesTable}/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [CF.CLASS_NAME]: data.name,
          [CF.DESCRIPTION]: data.description,
          [CF.OBJECTIVES]: data.objectives,
          ...(sessionId && { [CF.SESSION]: [sessionId] }),
          ...(teacherId && { [CF.TEACHER]: [teacherId] }),
          [CF.TYPE]: data.type,
          [CF.STATUS]: "Proposed",
        }),
      },
      {},
      tenant
    );
    revalidatePath(`/${tenant}/education/portal`);
    return { success: true };
  } catch (e) {
    console.error("Failed to submit proposal:", e);
    return { success: false };
  }
}

export async function claimBountyAction(classId: number, teacherName: string, explicitTenant?: string) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false, error: guard.error };

  const tenant = await resolveTenant(explicitTenant);
  if (isPostgresEnabled()) {
    try {
      const res = await claimBountyPg(tenant, classId, teacherName);
      if (res.success) {
        revalidatePath(`/${tenant}/education/portal`);
        revalidatePath(`/${tenant}/education/proposals`);
      }
      return res;
    } catch (error) {
      console.error("[Postgres] claimBountyAction failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(tenant);
  const peopleTable = tables.PEOPLE || DB.PEOPLE.ID;
  const classesTable = tables.CLASSES || DB.CLASSES.ID;
  const CF = DB.CLASSES.FIELDS;

  const teacherRes = await fetchBaserow(
    `/database/rows/table/${peopleTable}/`,
    {},
    {
      user_field_names: "true",
      [`filter__${DB.PEOPLE.FIELDS.FULL_NAME}__equal`]: teacherName,
      size: "1",
    },
    tenant
  );
  const teacherId = Array.isArray(teacherRes) && teacherRes.length > 0 ? teacherRes[0].id : null;

  if (!teacherId) return { success: false, error: "Teacher not found in database" };

  try {
    await fetchBaserow(
      `/database/rows/table/${classesTable}/${classId}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [CF.TEACHER]: [teacherId],
          [CF.STATUS]: "Proposed",
        }),
      },
      {},
      tenant
    );
    revalidatePath(`/${tenant}/education/portal`);
    revalidatePath(`/${tenant}/education/proposals`);
    return { success: true };
  } catch (e) {
    console.error("Failed to claim bounty:", e);
    return { success: false };
  }
}

export async function updateApplicantStatus(
  personId: number,
  oldTags: string[],
  newTag: string,
  explicitTenant?: string
) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "edit_compliance");
  if (!guard.ok) return { success: false, error: guard.error };

  if (isPostgresEnabled()) {
    try {
      const res = await updateApplicantStatusPg(tenant, personId, oldTags, newTag);
      if (res.success) revalidatePath(`/${tenant}/education/hiring`);
      return res;
    } catch (error) {
      console.error("[Postgres] updateApplicantStatus failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(tenant);
  const peopleTable = tables.PEOPLE || DB.PEOPLE.ID;
  const hiringTags = ["Faculty Applicant", "Faculty Interviewing", "Active Faculty"];
  const keptTags = oldTags.filter((t) => !hiringTags.includes(t));
  const newTags = [...keptTags, newTag];

  try {
    await fetchBaserow(
      `/database/rows/table/${peopleTable}/${personId}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [DB.PEOPLE.FIELDS.STATUS]: newTags,
        }),
      },
      {},
      tenant
    );

    revalidatePath(`/${tenant}/education/hiring`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update applicant status:", error);
    return { success: false };
  }
}

export async function fetchRosterAction(classId: number, explicitTenant?: string) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return [];

  try {
    const tenant = await resolveTenant(explicitTenant);
    if (isPostgresEnabled()) {
      try {
        const pgRoster = await getClassRosterPg(tenant, classId);
        if (pgRoster !== null) {
          return pgRoster
            .filter((r) => r.status !== "Instructor")
            .map((r) => ({
              id: r.id,
              name: r.name,
              age: r.age || "?",
              email: r.email,
              phone: r.phone,
            }));
        }
      } catch (error) {
        console.error("[Postgres] fetchRosterAction failed, falling back:", error);
      }
    }

    const { DB, tables } = await getTenantContext(tenant);
    const peopleTable = tables.PEOPLE || DB.PEOPLE.ID;
    const PF = DB.PEOPLE.FIELDS;

    const students = await fetchBaserow(
      `/database/rows/table/${peopleTable}/`,
      {},
      {
        user_field_names: "true",
        [`filter__${PF.CLASSES_STUDENTS}__link_row_has`]: classId,
        size: "200",
      },
      tenant
    );

    if (!Array.isArray(students)) return [];

    return students.map((row: any) => ({
      id: row.id,
      name: row["Full Name"] || row[PF.FULL_NAME] || "Unknown Student",
      age: row["Age"] || row[PF.AGE] || "?",
      email: row["CYT Account Personal Email"] || row[PF.CYT_ACCOUNT_PERSONAL_EMAIL] || "",
      phone: row["Phone Number"] || row[PF.PHONE_NUMBER] || "",
    }));
  } catch (error) {
    console.error("❌ [fetchRosterAction] Error:", error);
    return [];
  }
}

export async function updateClassSchedule(
  classId: number,
  payload: { day: string; time: string; location: string; status: string },
  explicitTenant?: string
) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "edit_compliance");
  if (!guard.ok) return { success: false, error: guard.error };

  if (isPostgresEnabled()) {
    try {
      const res = await updateClassSchedulePg(tenant, classId, payload);
      if (res.success) {
        revalidatePath(`/${tenant}/education/planning`);
        revalidatePath(`/${tenant}/education`);
      }
      return res;
    } catch (error) {
      console.error("[Postgres] updateClassSchedule failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(tenant);
  const classesTable = tables.CLASSES || DB.CLASSES.ID;
  const CF = DB.CLASSES.FIELDS;

  await fetchBaserow(
    `/database/rows/table/${classesTable}/${classId}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [CF.DAY]: payload.day || "",
        [CF.TIME_SLOT]: payload.time || "",
        [CF.LOCATION]: payload.location || "",
        [CF.STATUS]: payload.status,
      }),
    },
    {},
    tenant
  );

  revalidatePath(`/${tenant}/education/planning`);
  revalidatePath(`/${tenant}/education`);
  return { success: true };
}

// --- WORKFLOW ACTIONS ---

export async function toggleWorkflowTag(productionId: number, tagKey: string, explicitTenant?: string) {
  if (!productionId) return;

  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return;

  const keyMap: Record<string, string> = {
    auditions: "Auditions",
    callbacks: "Callbacks",
    casting: "Casting",
    first_reh: "FirstRehearsal",
    superSat: "SuperSaturday",
    tech_mon: "Tech_Mon",
    tech_tue: "Tech_Tue",
    tech_wed: "Tech_Wed",
    tech_thu: "Tech_Thu",
    tech_fri: "Tech_Fri",
    weekend1: "ShowWeekend1",
    weekend2: "ShowWeekend2",
  };

  const targetTag = keyMap[tagKey] || tagKey;

  if (isPostgresEnabled()) {
    try {
      await toggleWorkflowTagPg(tenant, productionId, targetTag);
      revalidatePath(`/${tenant}`);
      revalidatePath("/");
      return;
    } catch (error) {
      console.error("[Postgres] toggleWorkflowTag failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(tenant);
  const productionsTable = tables.PRODUCTIONS || DB.PRODUCTIONS.ID;

  try {
    const freshRow = await fetchBaserow(
      `/database/rows/table/${productionsTable}/${productionId}/`,
      {},
      {},
      tenant
    );
    if (!freshRow || freshRow.error) throw new Error("Fetch failed");

    const currentTags = freshRow[DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES] || [];
    const currentValues = currentTags.map((t: any) => t.value);

    const newValues = currentValues.includes(targetTag)
      ? currentValues.filter((v: string) => v !== targetTag)
      : [...currentValues, targetTag];

    await fetchBaserow(
      `/database/rows/table/${productionsTable}/${productionId}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [DB.PRODUCTIONS.FIELDS.WORKFLOW_OVERRIDES]: newValues,
        }),
      },
      {},
      tenant
    );

    revalidatePath(`/${tenant}`);
    revalidatePath("/");
  } catch (e) {
    console.error("Toggle Failed:", e);
  }
}

export async function switchProduction(formData: FormData) {
  const productionId = formData.get("productionId")?.toString();
  const redirectPath = formData.get("redirectPath")?.toString() || "/";

  if (productionId) {
    (await cookies()).set("active_production_id", productionId, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  redirect(redirectPath);
}

export async function markStepComplete(productionId: number, stepKey: string, explicitTenant?: string) {
  if (!productionId) return;
  await toggleWorkflowTag(productionId, stepKey, explicitTenant);
}

// --- SCENE ANALYSIS ACTIONS ---

export async function updateSceneLoads(
  updates: { id: number; load: { music: number; dance: number; block: number } }[],
  explicitTenant?: string
) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "manage_casting");
  if (!guard.ok) return { success: false, error: guard.error };

  if (isPostgresEnabled()) {
    try {
      const res = await updateSceneLoadsPg(tenant, updates);
      if (res.success) revalidatePath(`/${tenant}/production`);
      return res;
    } catch (error) {
      console.error("[Postgres] updateSceneLoads failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(tenant);
  const scenesTable = tables.SCENES || DB.SCENES.ID;
  const SF = DB.SCENES.FIELDS;

  await Promise.all(
    updates.map((update) =>
      fetchBaserow(
        `/database/rows/table/${scenesTable}/${update.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [SF.MUSIC_LOAD]: update.load.music,
            [SF.DANCE_LOAD]: update.load.dance,
            [SF.BLOCKING_LOAD]: update.load.block,
          }),
        },
        {},
        tenant
      )
    )
  );

  revalidatePath(`/${tenant}/production`);
  return { success: true };
}

export async function updateSceneStatus(
  sceneId: number,
  field: "music" | "dance" | "block",
  status: string,
  explicitTenant?: string
) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "manage_casting");
  if (!guard.ok) return;

  if (isPostgresEnabled()) {
    try {
      await updateSceneStatusPg(tenant, sceneId, field, status);
      revalidatePath(`/${tenant}/production`);
      return;
    } catch (error) {
      console.error("[Postgres] updateSceneStatus failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(tenant);
  const scenesTable = tables.SCENES || DB.SCENES.ID;
  const SF = DB.SCENES.FIELDS;
  const fieldMap = {
    music: SF.MUSIC_STATUS,
    dance: SF.DANCE_STATUS,
    block: SF.BLOCKING_STATUS,
  };

  await fetchBaserow(
    `/database/rows/table/${scenesTable}/${sceneId}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldMap[field]]: status }),
    },
    {},
    tenant
  );
  revalidatePath(`/${tenant}/production`);
}

// ============================================================================
// --- SCHEDULING ACTIONS ---
// ============================================================================

export async function saveScheduleBatch(productionId: number, items: any[], explicitTenant?: string) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  if (isPostgresEnabled()) {
    try {
      const res = await saveScheduleBatchPg(tenant, productionId, items);
      if (res.success) revalidatePath(`/${tenant}/production/${productionId}/schedule`);
      return res;
    } catch (error) {
      console.error("[Postgres] saveScheduleBatch failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(tenant);
  const eventsTable = tables.EVENTS || DB.EVENTS.ID;
  const slotsTable = tables.SCHEDULE_SLOTS || DB.SCHEDULE_SLOTS.ID;
  const EF = DB.EVENTS.FIELDS;
  const SLF = DB.SCHEDULE_SLOTS.FIELDS;

  const itemsByDate: Record<string, any[]> = {};
  items.forEach((item) => {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
    itemsByDate[item.date].push(item);
  });

  const promises = Object.entries(itemsByDate).map(async ([date, dayItems]) => {
    let parentEventId = dayItems[0].existingParentEventId;

    if (!parentEventId) {
      const minTime = Math.min(...dayItems.map((i: any) => i.startTime));
      const maxTime = Math.max(...dayItems.map((i: any) => i.startTime + i.duration / 60));

      const parentRes = await fetchBaserow(
        `/database/rows/table/${eventsTable}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [EF.PRODUCTION]: [productionId],
            [EF.EVENT_DATE]: date,
            [EF.START_TIME]: `${date}T${formatTimeHHMM(minTime)}:00`,
            [EF.END_TIME]: `${date}T${formatTimeHHMM(maxTime)}:00`,
          }),
        },
        {},
        tenant
      );
      if (parentRes && !parentRes.error) parentEventId = parentRes.id;
    }

    if (parentEventId) {
      await Promise.all(
        dayItems.map((item) =>
          fetchBaserow(
            `/database/rows/table/${slotsTable}/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                [SLF.EVENT_LINK]: [parentEventId],
                [SLF.SCENE]: [item.sceneId],
                [SLF.TRACK]: item.track,
                [SLF.START_TIME]: `${date}T${formatTimeHHMM(item.startTime)}:00`,
                [SLF.DURATION]: item.duration,
              }),
            },
            {},
            tenant
          )
        )
      );
    }
  });

  await Promise.all(promises);
  revalidatePath(`/${tenant}/production/${productionId}/schedule`);
  return { success: true };
}

// ============================================================================
// --- CASTING ACTIONS ---
// ============================================================================

export async function generateCastingRows(tenant: string, productionId: number) {
  const resolvedTenant = await resolveTenant(tenant);
  const guard = await requirePermission(resolvedTenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  if (isPostgresEnabled()) {
    try {
      const res = await generateCastingRowsPg(resolvedTenant, productionId);
      if (res.success) revalidatePath(`/${resolvedTenant}/production/${productionId}/casting`);
      return res;
    } catch (error) {
      console.error("[Postgres] generateCastingRows failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(resolvedTenant);
  const productionsTable = tables.PRODUCTIONS || DB.PRODUCTIONS.ID;
  const rolesTable = tables.BLUEPRINT_ROLES || DB.BLUEPRINT_ROLES.ID;
  const assignmentsTable = tables.ASSIGNMENTS || DB.ASSIGNMENTS.ID;
  const AF = DB.ASSIGNMENTS.FIELDS;

  const production = await fetchBaserow(
    `/database/rows/table/${productionsTable}/${productionId}/`,
    {},
    { user_field_names: "true" },
    resolvedTenant
  );
  if (!production) return { success: false, error: "Production not found" };

  const masterShowId = production["Master Show Database"]?.[0]?.id;
  if (!masterShowId) return { success: false, error: "No Master Show linked" };

  const blueprintRoles = await fetchBaserow(
    `/database/rows/table/${rolesTable}/`,
    {},
    {
      [`filter__${DB.BLUEPRINT_ROLES.FIELDS.MASTER_SHOW_DATABASE}__link_row_has`]: masterShowId,
      size: "200",
    },
    resolvedTenant
  );
  if (!Array.isArray(blueprintRoles)) return { success: false, error: "Failed to fetch blueprint" };

  const existing = await fetchBaserow(
    `/database/rows/table/${assignmentsTable}/`,
    {},
    {
      [`filter__${AF.PRODUCTION}__link_row_has`]: productionId,
      size: "200",
    },
    resolvedTenant
  );

  const existingRoleIds = new Set(
    Array.isArray(existing) ? existing.map((r: any) => r[AF.PERFORMANCE_IDENTITY]?.[0]?.id) : []
  );

  const rolesToCreate = blueprintRoles.filter((role) => !existingRoleIds.has(role.id));
  if (rolesToCreate.length === 0) return { success: true, count: 0, message: "Already up to date" };

  await Promise.all(
    rolesToCreate.map((role) =>
      fetchBaserow(
        `/database/rows/table/${assignmentsTable}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [AF.PRODUCTION]: [productionId],
            [AF.PERFORMANCE_IDENTITY]: [role.id],
          }),
        },
        {},
        resolvedTenant
      )
    )
  );

  revalidatePath(`/${resolvedTenant}/production/${productionId}/casting`);
  return { success: true, count: rolesToCreate.length };
}

export async function saveCastingGrid(
  tenant: string,
  productionId: number,
  actorChanges: any[],
  sceneChanges: any[],
  deletedRowIds: number[] = [],
  createdRows: any[] = []
) {
  const resolvedTenant = await resolveTenant(tenant);
  const guard = await requirePermission(resolvedTenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  if (isPostgresEnabled()) {
    try {
      const res = await saveCastingGridPg(
        resolvedTenant,
        productionId,
        actorChanges,
        sceneChanges,
        deletedRowIds,
        createdRows
      );
      if (res.success) revalidatePath(`/${resolvedTenant}/production/${productionId}/casting`);
      return res;
    } catch (error) {
      console.error("[Postgres] saveCastingGrid failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(resolvedTenant);
  const assignmentsTable = tables.ASSIGNMENTS || DB.ASSIGNMENTS.ID;
  const sceneAssignmentsTable = tables.SCENE_ASSIGNMENTS || DB.SCENE_ASSIGNMENTS.ID;
  const AF = DB.ASSIGNMENTS.FIELDS;
  const SAF = DB.SCENE_ASSIGNMENTS.FIELDS;

  if (deletedRowIds.length > 0) {
    await Promise.all(
      deletedRowIds.map((id) =>
        fetchBaserow(
          `/database/rows/table/${assignmentsTable}/${id}/`,
          { method: "DELETE" },
          {},
          resolvedTenant
        )
      )
    );
  }

  if (createdRows.length > 0) {
    await Promise.all(
      createdRows.map((row) =>
        fetchBaserow(
          `/database/rows/table/${assignmentsTable}/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              [AF.PRODUCTION]: [productionId],
              [AF.PERSON]: row.assignedStudentIds || [],
            }),
          },
          {},
          resolvedTenant
        )
      )
    );
  }

  for (const change of actorChanges) {
    await fetchBaserow(
      `/database/rows/table/${assignmentsTable}/${change.assignmentId}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [AF.PERSON]: change.studentIds,
        }),
      },
      {},
      resolvedTenant
    );
  }

  for (const change of sceneChanges) {
    const { assignmentId, addedSceneIds, removedSceneIds } = change;

    let studentIds: number[] = [];
    const actorUpdate = actorChanges.find((a) => a.assignmentId === assignmentId);

    if (actorUpdate) {
      studentIds = actorUpdate.studentIds;
    } else {
      const row = await fetchBaserow(
        `/database/rows/table/${assignmentsTable}/${assignmentId}/`,
        {},
        { user_field_names: "true" },
        resolvedTenant
      );
      if (row && row.Person) studentIds = row.Person.map((p: any) => p.id);
    }

    if (studentIds.length === 0) continue;

    for (const studentId of studentIds) {
      for (const sceneId of addedSceneIds) {
        await fetchBaserow(
          `/database/rows/table/${sceneAssignmentsTable}/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              [SAF.PERSON]: [studentId],
              [SAF.SCENE]: [sceneId],
              [SAF.PRODUCTION]: [productionId],
            }),
          },
          {},
          resolvedTenant
        );
      }

      for (const sceneId of removedSceneIds) {
        const existing = await fetchBaserow(
          `/database/rows/table/${sceneAssignmentsTable}/`,
          {},
          {
            filter_type: "AND",
            [`filter__${SAF.PERSON}__link_row_has`]: studentId,
            [`filter__${SAF.SCENE}__link_row_has`]: sceneId,
            [`filter__${SAF.PRODUCTION}__link_row_has`]: productionId,
          },
          resolvedTenant
        );

        if (Array.isArray(existing) && existing.length > 0) {
          for (const item of existing) {
            await fetchBaserow(
              `/database/rows/table/${sceneAssignmentsTable}/${item.id}/`,
              { method: "DELETE" },
              {},
              resolvedTenant
            );
          }
        }
      }
    }
  }

  revalidatePath(`/${resolvedTenant}/production/${productionId}/casting`);
  return { success: true };
}

export async function clearCastingData(productionId: number, explicitTenant?: string) {
  const tenant = await resolveTenant(explicitTenant);
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false, error: guard.error };

  if (isPostgresEnabled()) {
    try {
      const res = await clearCastingDataPg(tenant, productionId);
      if (res.success) revalidatePath(`/${tenant}/production/${productionId}/casting`);
      return res;
    } catch (error) {
      console.error("[Postgres] clearCastingData failed, falling back:", error);
    }
  }

  const { DB, tables } = await getTenantContext(tenant);
  const sceneAssignmentsTable = tables.SCENE_ASSIGNMENTS || DB.SCENE_ASSIGNMENTS.ID;
  const assignmentsTable = tables.ASSIGNMENTS || DB.ASSIGNMENTS.ID;

  const sceneAssigns = await fetchBaserow(
    `/database/rows/table/${sceneAssignmentsTable}/`,
    {},
    {
      [`filter__${DB.SCENE_ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: productionId,
      size: "200",
    },
    tenant
  );
  if (Array.isArray(sceneAssigns)) {
    await Promise.all(
      sceneAssigns.map((row) =>
        fetchBaserow(
          `/database/rows/table/${sceneAssignmentsTable}/${row.id}/`,
          { method: "DELETE" },
          {},
          tenant
        )
      )
    );
  }

  const castAssigns = await fetchBaserow(
    `/database/rows/table/${assignmentsTable}/`,
    {},
    {
      [`filter__${DB.ASSIGNMENTS.FIELDS.PRODUCTION}__link_row_has`]: productionId,
      size: "200",
    },
    tenant
  );
  if (Array.isArray(castAssigns)) {
    await Promise.all(
      castAssigns.map((row) =>
        fetchBaserow(
          `/database/rows/table/${assignmentsTable}/${row.id}/`,
          { method: "DELETE" },
          {},
          tenant
        )
      )
    );
  }

  revalidatePath(`/${tenant}/production/${productionId}/casting`);
  return { success: true };
}
