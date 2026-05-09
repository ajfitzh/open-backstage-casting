// app/actions/family.ts
"use server";

import { fetchBaserow, getDB, getTenantTableConfig } from "@/app/lib/baserow";

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