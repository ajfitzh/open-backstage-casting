// app/actions/committees.ts
"use server"

import { revalidatePath } from 'next/cache';
import { fetchBaserow, getDB, getTenantTableConfig } from "@/app/lib/baserow";

export async function submitCommitteeReport(tenant: string, data: any) {
  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.COMMITTEE_REPORTS.FIELDS;
    
    // Fallback to static ID if you haven't added it to the Tenant Registry table yet
    const tableId = (tables as any).COMMITTEE_REPORTS || DB.COMMITTEE_REPORTS.ID;
    
    // Build the payload using your new schema fields
    const payload = {
      [F.NAME]: `${data.committeeName} - ${data.phase} Report`, 
      [F.PRODUCTION]: [data.productionId],
      [F.SUBMITTER]: [data.submitterId],
      [F.COMMITTEE_NAME]: data.committeeName,
      [F.REPORT_DATE]: new Date().toISOString().split('T')[0], // YYYY-MM-DD
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
    // 🟢 1. THE DRY RUN INTERCEPT
    // Set ENABLE_DRY_RUN="true" in your .env or .env.local to trigger this safe mode.
    if (process.env.ENABLE_DRY_RUN === "true") {
        console.log(`\n💾 --- DRY RUN SAVE: ${phase} ---`);
        console.log(`🏢 Tenant: ${tenant}`);
        
        const payloadChanges = Object.keys(assignments).map(id => ({
            personId: id,
            assignedTo: assignments[Number(id)],
            isChair: chairs[Number(id)] || false
        }));
        
        console.log("📦 Payload Snapshot (First 5):", payloadChanges.slice(0, 5), "... (truncated)");
        
        // Fake a 1.5-second network delay so you can see the UI loading spinner
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log("✅ Dry run complete. Aborting real database write.");
        return { success: true }; 
    }

    // 🟢 2. REAL DATABASE WRITE
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const tableId = tables.COMMITTEE_PREFS;
    const F = DB.COMMITTEE_PREFS.FIELDS;
    
    // STRICT TYPING: Map the phase to the exact field_XXXX ID
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
    
    // Revalidate the Next.js cache so the page instantly reflects the new data
    revalidatePath('/[tenant]/(main)/(staff)/committees', 'page');
    return { success: true };
}