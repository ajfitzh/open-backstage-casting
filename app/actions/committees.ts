// app/actions/committees.ts
"use server"

import { revalidatePath } from 'next/cache';
import { fetchBaserow, getDB, getTenantTableConfig } from "@/app/lib/baserow";

export async function submitCommitteeReport(tenant: string, data: any) {
  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.COMMITTEE_REPORTS.FIELDS;
    
    const tableId = (tables as any).COMMITTEE_REPORTS || DB.COMMITTEE_REPORTS.ID;
    
    const payload = {
      [F.NAME]: `${data.committeeName} - ${data.phase} Report`, 
      [F.PRODUCTION]: [data.productionId],
      [F.SUBMITTER]: [data.submitterId],
      [F.COMMITTEE_NAME]: data.committeeName,
      [F.REPORT_DATE]: new Date().toISOString().split('T')[0], 
      [F.PRODUCTION_PHASE]: data.phase,
      [F.PROGRESS_UPDATE]: data.progressUpdate || "",
      [F.ATTENDANCE_NOTES]: data.attendanceNotes || "",
      [F.BLOCKERS_AND_NEEDS]: data.blockers || "",
      [F.ESTIMATED_COMPLETION]: parseInt(data.completion) || 0,
      [F.MONEY_SPENT_THIS_WEEK]: parseFloat(data.moneySpent) || 0,
    };

    const res = await fetchBaserow(`/database/rows/table/${tableId}/`, {
      method: "POST",
      body: JSON.stringify(payload)
    }, {}, tenant);

    if (!res || res.error) {
      console.error("Failed to submit report:", res);
      return { success: false, error: "Failed to save the report to the database." };
    }

    return { success: true };
  } catch (error) {
    console.error("Report Submission Error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function saveCommitteeAssignments(
    tenant: string,
    phase: 'Pre-Show' | 'Show Week',
    assignments: Record<number, string>,
    chairs: Record<number, boolean> 
) {
    if (process.env.ENABLE_DRY_RUN === "true") {
        console.log(`\n💾 --- DRY RUN SAVE: ${phase} ---`);
        console.log(`🏢 Tenant: ${tenant}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { success: true }; 
    }

    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const tableId = tables.COMMITTEE_PREFS;
    const F = DB.COMMITTEE_PREFS.FIELDS;
    
    const fieldId = phase === 'Pre-Show' ? F.PRE_SHOW_PHASE : F.SHOW_WEEK_COMMITTEES;

    const updates = Object.entries(assignments).map(([id, value]) => {
        return fetchBaserow(`/database/rows/table/${tableId}/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({
                [fieldId]: value === "Unassigned" ? null : value,
                [F.IS_CHAIR]: chairs[Number(id)] || false 
            })
        }, {}, tenant);
    });

    await Promise.all(updates);
    revalidatePath('/[tenant]/(main)/(staff)/committees', 'page');
    return { success: true };
}

// --- NEW CRUD ACTIONS ---

export async function addCommitteeVolunteer(tenant: string, data: { name: string, email: string, phone: string }) {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.COMMITTEE_PREFS.FIELDS;

    await fetchBaserow(`/database/rows/table/${tables.COMMITTEE_PREFS}/`, {
        method: 'POST',
        body: JSON.stringify({
            [F.PARENT_NAME]: data.name,
            [F.EMAIL]: data.email,
            [F.PHONE]: data.phone
        })
    }, {}, tenant);

    revalidatePath('/[tenant]/(main)/(staff)/committees', 'page');
    return { success: true };
}

export async function updateCommitteeVolunteer(tenant: string, rowId: number, data: { name: string, email: string, phone: string }) {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.COMMITTEE_PREFS.FIELDS;

    await fetchBaserow(`/database/rows/table/${tables.COMMITTEE_PREFS}/${rowId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
            [F.PARENT_NAME]: data.name,
            [F.EMAIL]: data.email,
            [F.PHONE]: data.phone
        })
    }, {}, tenant);

    revalidatePath('/[tenant]/(main)/(staff)/committees', 'page');
    return { success: true };
}

export async function deleteCommitteeVolunteer(tenant: string, rowId: number) {
    const tables = await getTenantTableConfig(tenant);
    
    await fetchBaserow(`/database/rows/table/${tables.COMMITTEE_PREFS}/${rowId}/`, {
        method: 'DELETE'
    }, {}, tenant);

    revalidatePath('/[tenant]/(main)/(staff)/committees', 'page');
    return { success: true };
}