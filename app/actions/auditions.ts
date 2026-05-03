// app/actions/auditions.ts
"use server";

import { fetchBaserow, DB, findUserByEmail, getTenantTableConfig } from "@/app/lib/baserow";

export async function submitRealAudition(tenant: string, productionId: number, formData: any, lookupEmail: string) {
  try {
    const tables = await getTenantTableConfig(tenant);
    
    // 1. Find or create the Person
    let personId;
    let person = await findUserByEmail(tenant, lookupEmail);
    
    if (person) {
      personId = person.id;
    } else {
      // Create new person if they don't exist
      const nameParts = formData.fullName.split(' ');
      const newPersonPayload = {
        [DB.PEOPLE.FIELDS.FIRST_NAME]: nameParts[0],
        [DB.PEOPLE.FIELDS.LAST_NAME]: nameParts.slice(1).join(' '),
        [DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL]: lookupEmail,
        [DB.PEOPLE.FIELDS.STATUS]: ["Student"],
      };
      
      const newPerson = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {
        method: "POST",
        body: JSON.stringify(newPersonPayload)
      });
      personId = newPerson.id;
    }

    // 2. Submit the Audition Record
    const auditionPayload: any = {
      [DB.AUDITIONS.FIELDS.PERFORMER]: [parseInt(personId)],
      [DB.AUDITIONS.FIELDS.PRODUCTION]: [productionId],
      [DB.AUDITIONS.FIELDS.DATE]: new Date().toISOString(),
      [DB.AUDITIONS.FIELDS.GENDER]: { value: formData.sex || "Unknown" },
      [DB.AUDITIONS.FIELDS.HEIGHT]: `${formData.heightFt}'${formData.heightIn}"`,
      [DB.AUDITIONS.FIELDS.SONG]: formData.songTitle,
      [DB.AUDITIONS.FIELDS.CONFLICTS]: JSON.stringify(formData.conflicts),
      
      // 🟢 Link it directly to the new Audition Slots table
      // Ensure the field name matches your new Baserow linked column perfectly
      "Audition Slot": formData.auditionSlotId ? [formData.auditionSlotId] : [], 
    };

    // Attach URLs only if they exist to avoid passing nulls into text fields
    if (formData.headshotUrl) {
        auditionPayload["Headshot URL"] = formData.headshotUrl;
    }
    
    if (formData.musicFileUrl) {
        auditionPayload["Audio Track URL"] = formData.musicFileUrl;
    }

    const audition = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {
      method: "POST",
      body: JSON.stringify(auditionPayload)
    });

    return { success: true, auditionId: audition?.id };
  } catch (error) {
    console.error("Failed to submit audition:", error);
    return { success: false, error: "Submission failed" };
  }
}