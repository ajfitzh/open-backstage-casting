// app/actions/auth.ts
"use server";

import { fetchBaserow, DB, findUserByEmail, getTenantTableConfig } from "@/app/lib/baserow";
// import bcrypt from "bcryptjs"; // Uncomment if you hash passwords here

export async function upgradeGuestToUser(tenant: string, email: string, passwordRaw: string) {
  try {
    const tables = await getTenantTableConfig(tenant);
    
    // 1. Find the Guest record we just created
    const user = await findUserByEmail(tenant, email);
    if (!user) return { success: false, error: "Account not found." };

    // 2. Hash the password (Highly recommended!)
    // const hashedPassword = await bcrypt.hash(passwordRaw, 10);
    const hashedPassword = passwordRaw; // Replace with hashed version in production

    // 3. Update the Baserow record
    // Note: Replace 'PASSWORD_FIELD' with your actual Baserow field name for passwords
    const payload = {
      [DB.PEOPLE.FIELDS.STATUS]: ["User"], // Upgrade them from Guest!
      "Password": hashedPassword 
    };

    await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/${user.id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to upgrade user:", error);
    return { success: false, error: "Something went wrong." };
  }
}