"use server";

import { fetchBaserow, DB, getTenantTableConfig } from "@/app/lib/baserow";

export async function saveCheckIn(
  tenant: string, 
  auditionId: number, 
  status: string, 
  lobbyNote: string,
  performerId?: number | null,
  updatedName?: string,
  updatedPhone?: string,
  updatedEmail?: string
) {
  try {
    const tables = await getTenantTableConfig(tenant);
    
    // 1. Calculate Check-In Boolean
    const isCheckedIn = status === "Checked In" || status === "Late";

    // 2. Patch the Audition Table (Check-In Status & Lobby Notes)
    const auditionRes = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
       method: "PATCH",
       body: JSON.stringify({
           [DB.AUDITIONS.FIELDS.LOBBY_NOTE]: lobbyNote || "",
           [DB.AUDITIONS.FIELDS.CHECKED_IN]: isCheckedIn
       })
    });

    // 3. If they edited contact info, Patch the Master People Table!
    if (performerId && (updatedPhone || updatedEmail || updatedName)) {
        const peopleUpdate: any = {};
        
        // Split name back into First/Last for Baserow
        if (updatedName) {
            const parts = updatedName.split(' ');
            peopleUpdate[DB.PEOPLE.FIELDS.FIRST_NAME] = parts[0];
            peopleUpdate[DB.PEOPLE.FIELDS.LAST_NAME] = parts.slice(1).join(' ');
        }
        if (updatedPhone) peopleUpdate[DB.PEOPLE.FIELDS.PHONE_NUMBER] = updatedPhone;
        if (updatedEmail) peopleUpdate[DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL] = updatedEmail;

        await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/${performerId}/`, {
            method: "PATCH",
            body: JSON.stringify(peopleUpdate)
        });
    }

    return { success: !auditionRes.error };
  } catch (e) {
    console.error("Check-In Save Error:", e);
    return { success: false };
  }
}