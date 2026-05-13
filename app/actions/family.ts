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

  // 2. Process the patch (Mapping directly to the new schema!)
  const payload = {
    [DB.AUDITIONS.FIELDS.HAIR_COLOR]: updateData.hairColor,
    [DB.AUDITIONS.FIELDS.PREFERRED_ROLES]: updateData.preferredRoles,
    [DB.AUDITIONS.FIELDS.VOCAL_RANGE]: updateData.vocalRange,
    [DB.AUDITIONS.FIELDS.ACCEPT_ANY_ROLE]: updateData.acceptAnyRole,
    [DB.AUDITIONS.FIELDS.STAGE_ROMANCE]: updateData.acceptRomance,
    [DB.AUDITIONS.FIELDS.WILLING_TO_ALTER_APPEARANCE]: updateData.willingToAlterAppearance,
    [DB.AUDITIONS.FIELDS.FEAR_OF_HEIGHTS]: updateData.fearOfHeights,
    [DB.AUDITIONS.FIELDS.OTHER_TALENTS]: updateData.otherTalents,
  };

  const response = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, {}, tenant);

  return { success: !response.error, data: response };
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