// app/actions/auditions.ts
"use server";

import { fetchBaserow, DB, getTenantTableConfig, getShowById } from "@/app/lib/baserow";

// ... (imports and resend setup remains the same)

export async function submitRealAudition(tenant: string, productionId: number, formData: any, lookupEmail: string) {
  try {
    const tables = await getTenantTableConfig(tenant);
    
    // 1. Resolve Student Identity
    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";

    const studentSearchParams = {
      filter_type: "AND",
      [`filter__${DB.PEOPLE.FIELDS.FIRST_NAME}__equal`]: firstName,
      [`filter__${DB.PEOPLE.FIELDS.LAST_NAME}__equal`]: lastName,
      [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: lookupEmail,
    };
    
    const existingStudents = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, studentSearchParams);
    
    let personId;
    const heightInches = (parseInt(formData.heightFt) || 0) * 12 + (parseInt(formData.heightIn) || 0);

    if (existingStudents && existingStudents.length > 0) {
      personId = existingStudents[0].id;
      
      const updatePayload: any = {
        [DB.PEOPLE.FIELDS.DATE_OF_BIRTH]: formData.dob || null,
        [DB.PEOPLE.FIELDS.HEIGHT_TOTAL_INCHES]: heightInches,
        // 🟢 SAVING AS URL: This now works because the field type is "URL"
        [DB.PEOPLE.FIELDS.HEADSHOT]: formData.headshotUrl 
      };

      await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/${personId}/`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload)
      });

    } else {
      const newPersonPayload: any = {
        [DB.PEOPLE.FIELDS.FIRST_NAME]: firstName,
        [DB.PEOPLE.FIELDS.LAST_NAME]: lastName,
        [DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL]: lookupEmail,
        [DB.PEOPLE.FIELDS.DATE_OF_BIRTH]: formData.dob || null,
        [DB.PEOPLE.FIELDS.HEIGHT_TOTAL_INCHES]: heightInches,
        [DB.PEOPLE.FIELDS.HEADSHOT]: formData.headshotUrl, // 🟢 SAVING AS URL
        [DB.PEOPLE.FIELDS.STATUS]: ["Guest"], 
      };
      
      const newPerson = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {
        method: "POST",
        body: JSON.stringify(newPersonPayload)
      });
      personId = newPerson.id;
    }

    // 2. Format Rehearsal Conflicts
    const conflictString = Object.entries(formData.conflicts || {})
       .filter(([key, val]: any) => val.level !== "available")
       .map(([key, val]: any) => `${key}: ${val.level} (${val.notes || "No notes"})`)
       .join("\n");

    // 3. Submit the Audition Record
    const auditionPayload: any = {
      [DB.AUDITIONS.FIELDS.PERFORMER]: [parseInt(personId)],
      [DB.AUDITIONS.FIELDS.PRODUCTION]: [productionId],
      [DB.AUDITIONS.FIELDS.DATE]: new Date().toISOString().split('T')[0], 
      [DB.AUDITIONS.FIELDS.SONG]: formData.songTitle || "None",
      [DB.AUDITIONS.FIELDS.AUDITION_SLOTS]: formData.auditionSlotId ? [parseInt(formData.auditionSlotId)] : [], 
      // 🟢 Keep the Headshot URL in its own field for easy clicking
      [DB.AUDITIONS.FIELDS.HEADSHOT]: formData.headshotUrl, 
      // Admin Notes stays clean for director feedback
      [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: `Conflicts:\n${conflictString || "None"}\n\nTrack: ${formData.musicFileUrl || 'None'}`,
    };

    const audition = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {
      method: "POST",
      body: JSON.stringify(auditionPayload)
    });

    return { success: true, auditionId: audition?.id };
  } catch (error) {
    console.error("Critical Submission Error:", error);
    return { success: false, error: "Submission failed" };
  }
}