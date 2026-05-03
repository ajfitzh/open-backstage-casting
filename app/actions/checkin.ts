// app/actions/checkin.ts
"use server";

import { fetchBaserow, DB, getTenantTableConfig } from "@/app/lib/baserow";

export async function saveCheckIn(tenant: string, auditionId: number, status: string, lobbyNote: string) {
  try {
    const tables = await getTenantTableConfig(tenant);

    // 1. Fetch current Admin Notes so we preserve existing data (Grade, Hair, etc.)
    const row = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`);
    if (!row || row.error) return { success: false };

    let adminNotes = row[DB.AUDITIONS.FIELDS.ADMIN_NOTES] || "";

    // 2. Clean out old Status/Lobby tags using a cleaner regex
    // This prevents the field from growing infinitely with redundant tags
    adminNotes = adminNotes.replace(/STATUS:.*$/gm, '').replace(/LOBBY:.*$/gm, '').trim();

    // 3. Append the new tags on fresh lines
    const updatedNotes = `${adminNotes}\n\nSTATUS: ${status}${lobbyNote ? `\nLOBBY: ${lobbyNote}` : ''}`;

    // 4. Update Baserow
    const res = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
       method: "PATCH",
       body: JSON.stringify({
           [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: updatedNotes
       })
    });

    return { success: !res.error };
  } catch (e) {
    console.error("Check-In Save Error:", e);
    return { success: false };
  }
}