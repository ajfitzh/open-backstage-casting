// app/actions/auth.ts
"use server";

import { fetchBaserow, getDB, findUserByEmail, getTenantTableConfig } from "@/app/lib/baserow";
import bcrypt from "bcryptjs"; // Uncomment if you hash passwords here

export async function upgradeGuestToUser(tenant: string, email: string, passwordRaw: string) {
  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    
    // 1. Find the Guest record we just created
    const user = await findUserByEmail(tenant, email);
    if (!user) return { success: false, error: "Account not found." };

    // 2. Hash the password (Highly recommended!)
    const hashedPassword = await bcrypt.hash(passwordRaw, 10);
    // const hashedPassword = passwordRaw; // Replace with hashed version in production

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

export async function registerUser(tenant: string, data: any) {
  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.PEOPLE.FIELDS;
    
    // 1. Check if the user already exists
    const existingUser = await findUserByEmail(tenant, data.email);
    if (existingUser) {
        return { success: false, error: "An account with this email already exists." };
    }

    // 2. Hash the password securely
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 3. Create the brand new user in Baserow
    const payload = {
      [F.FIRST_NAME]: data.firstName,
      [F.LAST_NAME]: data.lastName,
      [F.CYT_ACCOUNT_PERSONAL_EMAIL]: data.email,
      [F.STATUS]: ["User"], // Set them as a standard User
      "Password": hashedPassword // Ensure this matches your actual Baserow password column name!
    };

    const res = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!res || res.error) {
      console.error("Baserow creation error:", res);
      return { success: false, error: "Failed to create account in the database." };
    }

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}