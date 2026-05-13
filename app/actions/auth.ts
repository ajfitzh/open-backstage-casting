// app/actions/auth.ts
"use server";

import { fetchBaserow, getDB, getTenantTableConfig } from "@/app/lib/baserow";
import { BaserowClient } from "@/app/lib/BaserowClient";
import bcrypt from "bcryptjs";

// 🟢 NEW: Claim Account / Set Password flow from Audition Success
export async function setAccountPassword(tenant: string, email: string, rawPassword: string) {
  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    
    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // Find the user by email
    const user = await BaserowClient.findUserByEmail(tenant, email);
    if (!user) return { success: false, error: "Account not found." };
    
    // Patch the APP_PASSWORD field
    const response = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/${user.id}/`, {
      method: "PATCH",
      body: JSON.stringify({
        [DB.PEOPLE.FIELDS.APP_PASSWORD]: hashedPassword
      })
    }, {}, tenant);

    return { success: !response.error };
  } catch (error) {
    console.error("Failed to set password:", error);
    return { success: false, error: "Something went wrong." };
  }
}

// 🟢 UPDATED: Upgrades a Guest using the correct schema mappings
export async function upgradeGuestToUser(tenant: string, email: string, passwordRaw: string) {
  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    
    const user = await BaserowClient.findUserByEmail(tenant, email);
    if (!user) return { success: false, error: "Account not found." };

    const hashedPassword = await bcrypt.hash(passwordRaw, 10);

    const payload = {
      [DB.PEOPLE.FIELDS.STATUS]: [{ value: "User" }], // Baserow requires objects for multiple/single select
      [DB.PEOPLE.FIELDS.APP_PASSWORD]: hashedPassword 
    };

    await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/${user.id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }, {}, tenant);

    return { success: true };
  } catch (error) {
    console.error("Failed to upgrade user:", error);
    return { success: false, error: "Something went wrong." };
  }
}

// 🟢 UPDATED: Registers a new user with correct schema mapping
export async function registerUser(tenant: string, data: any) {
  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.PEOPLE.FIELDS;
    
    const existingUser = await BaserowClient.findUserByEmail(tenant, data.email);
    if (existingUser) {
        return { success: false, error: "An account with this email already exists." };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const payload = {
      [F.FIRST_NAME]: data.firstName,
      [F.LAST_NAME]: data.lastName,
      [F.CYT_ACCOUNT_PERSONAL_EMAIL]: data.email,
      [F.STATUS]: [{ value: "User" }], 
      [F.APP_PASSWORD]: hashedPassword 
    };

    const res = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {
      method: "POST",
      body: JSON.stringify(payload)
    }, {}, tenant);

    if (!res || res.error) {
      return { success: false, error: "Failed to create account in the database." };
    }

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}