// app/actions/checkin.ts
"use server";

import { fetchBaserow, DB, getTenantTableConfig } from "@/app/lib/baserow";

export async function saveCheckIn(tenant: string, auditionId: number, status: string, lobbyNote: string) {
  try {
    const tables = await getTenantTableConfig(tenant);

    // 1. Fetch current Admin Notes so we don't overwrite the Grade/Hair/Conflicts
    const row = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`);
    if (!row || row.error) return { success: false };

    let adminNotes = row[DB.AUDITIONS.FIELDS.ADMIN_NOTES] || "";

    // 2. Remove old STATUS and LOBBY lines if they already exist
    adminNotes = adminNotes.replace(/\n\nSTATUS:.*$/m, '');
    adminNotes = adminNotes.replace(/\n\nLOBBY:.*$/m, '');

    // 3. Append the new real-time status from the Check-In table
    adminNotes += `\n\nSTATUS: ${status}`;
    if (lobbyNote) {
        adminNotes += `\n\nLOBBY: ${lobbyNote}`;
    }

    // 4. Save it back to Baserow
    const res = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
       method: "PATCH",
       body: JSON.stringify({
           [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: adminNotes
       })
    });

    return { success: !res.error };
  } catch (e) {
    console.error("Check-In Save Error:", e);
    return { success: false };
  }
}