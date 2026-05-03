// app/actions/checkin.ts
"use server";

import { fetchBaserow, DB, getTenantTableConfig } from "@/app/lib/baserow";

export async function saveCheckIn(tenant: string, auditionId: number, status: string, lobbyNote: string) {
  try {
    const tables = await getTenantTableConfig(tenant);

    // 1. Fetch current Admin Notes (using secure internal IDs again)
    const row = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`);
    if (!row || row.error) return { success: false };

    let adminNotes = row[DB.AUDITIONS.FIELDS.ADMIN_NOTES] || "";

    // 2. Remove old LOBBY lines if they already exist
    adminNotes = adminNotes.replace(/\n\nLOBBY:.*$/im, '');

    // 3. Append the new real-time lobby note
    if (lobbyNote) {
        adminNotes += `\n\nLOBBY: ${lobbyNote}`;
    }

    // 4. Calculate the boolean (True if Checked In OR Late)
    const isCheckedIn = status === "Checked In" || status === "Late";

    // 5. Save back to Baserow patching BOTH fields
    const res = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
       method: "PATCH",
       body: JSON.stringify({
           [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: adminNotes,
           [DB.AUDITIONS.FIELDS.CHECKED_IN]: isCheckedIn
       })
    });

    return { success: !res.error };
  } catch (e) {
    console.error("Check-In Save Error:", e);
    return { success: false };
  }
}