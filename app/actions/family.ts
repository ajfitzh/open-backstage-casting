// app/actions/family.ts
"use server";

import { getDB, fetchBaserow } from "@/app/lib/baserow";
import { getTenantTableConfig } from "@/app/lib/tenant-config";

// Fetch the existing audition record for editing
export async function getStudentAuditionForEdit(tenant: string, studentId: number, productionId: number) {
  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  
  const params = {
    filter_type: "AND",
    [`filter__${DB.AUDITIONS.FIELDS.PERFORMER}__link_row_has`]: studentId,
    [`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`]: productionId
  };
  
  const rows = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {}, params, tenant);
  
  if (!rows || rows.length === 0) return null;
  return rows[0]; 
}

// Save the updated details
export async function updateAuditionDetails(tenant: string, auditionId: number, updateData: any) {
  const DB = getDB(tenant);
  const tables = await getTenantTableConfig(tenant);
  
  // 1. Verify they haven't checked in yet
  const currentRecord = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {}, {}, tenant);
  if (currentRecord[DB.AUDITIONS.FIELDS.CHECKED_IN]) {
    return { success: false, error: "Audition is locked. Please speak to the stage manager to make changes." };
  }

  // 🟢 Extract Performer ID so we can update their global People record (Headshot, Height)
  const performerField = currentRecord[DB.AUDITIONS.FIELDS.PERFORMER];
  const personId = performerField && performerField.length > 0 ? performerField[0].id : null;

  // 2. Process the Audition patch
  const auditionPayload = {
    [DB.AUDITIONS.FIELDS.HAIR_COLOR]: updateData.hairColor,
    [DB.AUDITIONS.FIELDS.PREFERRED_ROLES]: updateData.preferredRoles,
    [DB.AUDITIONS.FIELDS.VOICE_TYPE]: updateData.voiceType, // Fixed from vocalRange
    [DB.AUDITIONS.FIELDS.ACCEPT_ANY_ROLE]: updateData.acceptAnyRole,
    [DB.AUDITIONS.FIELDS.STAGE_ROMANCE]: updateData.stageRomance, // Fixed from acceptRomance
    [DB.AUDITIONS.FIELDS.WILLING_TO_ALTER_APPEARANCE]: updateData.willingToAlterAppearance,
    [DB.AUDITIONS.FIELDS.FEAR_OF_HEIGHTS]: updateData.fearOfHeights,
    [DB.AUDITIONS.FIELDS.OTHER_TALENTS]: updateData.otherTalents,
    
    // 🟢 Added the missing form fields!
    [DB.AUDITIONS.FIELDS.SONG]: updateData.songTitle,
    [DB.AUDITIONS.FIELDS.BACKING_TRACK]: updateData.musicFileUrl,
    [DB.AUDITIONS.FIELDS.GRADE]: updateData.grade,
    [DB.AUDITIONS.FIELDS.CONFLICTS]: updateData.conflicts,
  };

  const auditionResponse = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
    method: "PATCH",
    body: JSON.stringify(auditionPayload)
  }, {}, tenant);

  if (auditionResponse.error) {
    return { success: false, error: auditionResponse.error };
  }

  // 3. 🟢 Process the People patch (For the Lookup fields!)
  if (personId && (updateData.headshotUrl || updateData.height)) {
    const peoplePayload: any = {};
    
    // According to schema.ts, HEADSHOT is a 'url' field type (field_5776)
    // Only save if it's a real URL (not a base64 data string from an incomplete upload)
    if (updateData.headshotUrl && !updateData.headshotUrl.startsWith('data:')) {
      peoplePayload[DB.PEOPLE.FIELDS.HEADSHOT] = updateData.headshotUrl;
    }
    
    // According to schema.ts, HEIGHT_TOTAL_INCHES is a 'number' field (field_5777)
    if (updateData.height) {
      peoplePayload[DB.PEOPLE.FIELDS.HEIGHT_TOTAL_INCHES] = parseInt(updateData.height, 10);
    }

    if (Object.keys(peoplePayload).length > 0) {
      await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/${personId}/`, {
        method: "PATCH",
        body: JSON.stringify(peoplePayload)
      }, {}, tenant);
    }
  }

  return { success: true, data: auditionResponse };
}
// Fetch all people tied to the parent's email
export async function getFamilyMembers(tenant: string, email: string) {
  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.PEOPLE.FIELDS;
    
    const searchParams = {
      filter_type: "AND",
      [`filter__${F.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
    };
    
    const family = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, searchParams);
    if (!Array.isArray(family)) return [];

    // Map strict Baserow field IDs to a clean frontend object
    return family.map((p: any) => ({
      id: p.id,
      firstName: p[F.FIRST_NAME] || "",
      lastName: p[F.LAST_NAME] || "",
      dateOfBirth: p[F.DATE_OF_BIRTH] || "Not Set",
      headshot: p[F.HEADSHOT]?.[0]?.url || null,
      address: p[F.ADDRESS] || "",
      emergencyContact: p[F.EMERGENCY_CONTACT_NAME] || "",
      tShirtSize: p[F.T_SHIRT_SIZE] || "",
      allergies: p[F.MEDICAL_NOTES] || "",
      tylenol: p[F.TYLENOL_APPROVAL] || false,
      ibuprofen: p[F.IBUPROFEN_APPROVAL] || false,
    }));
  } catch (error) {
    console.error("Failed to fetch family:", error);
    return [];
  }
}

// Save updates for a specific student's master profile
export async function updateStudentMasterProfile(tenant: string, personId: number, data: any) {
  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.PEOPLE.FIELDS;
    
    // Wire the payload directly to your robust generated schema fields (6133-6149)
    const payload = {
      [F.ADDRESS]: data.address || "",
      [F.EMERGENCY_CONTACT_NAME]: data.emergencyContact || "",
      [F.T_SHIRT_SIZE]: data.tShirtSize || "",
      [F.MEDICAL_NOTES]: data.allergies || "",
      [F.TYLENOL_APPROVAL]: data.tylenol || false,
      [F.IBUPROFEN_APPROVAL]: data.ibuprofen || false,
    };

    const res = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/${personId}/`, {
       method: "PATCH",
       body: JSON.stringify(payload)
    });

    if (!res || res.error) {
       console.error("Failed to update profile:", res);
       return { success: false, error: "Database rejected the update." };
    }

    return { success: true };
  } catch (error) {
    console.error("Profile Save Error:", error);
    return { success: false, error: "Failed to connect to the database." };
  }
}