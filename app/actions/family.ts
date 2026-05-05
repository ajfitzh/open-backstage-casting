"use server";

import { fetchBaserow, DB, getTenantTableConfig } from "@/app/lib/baserow";

// Fetch all people tied to the parent's email
export async function getFamilyMembers(tenant: string, email: string) {
  try {
    const tables = await getTenantTableConfig(tenant);
    const searchParams = {
      filter_type: "AND",
      [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email,
    };
    
    const family = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, searchParams);
    return Array.isArray(family) ? family : [];
  } catch (error) {
    console.error("Failed to fetch family:", error);
    return [];
  }
}

// Save updates for a specific student's master profile
export async function updateStudentMasterProfile(tenant: string, personId: number, data: any) {
  try {
    const tables = await getTenantTableConfig(tenant);
    
    // Map your frontend state to your Baserow fields
    // NOTE: Ensure these string names match your exact Baserow column headers!
    const payload = {
      "Address": data.address || "",
      "Emergency Contact": data.emergencyContact || "",
      "T-Shirt Size": data.tShirtSize || "",
      "Allergies": data.allergies || "",
      "Tylenol Permission": data.tylenol || false,
      "Ibuprofen Permission": data.ibuprofen || false,
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