// app/actions/auth.ts
"use server";

import { registerUserPg, setAccountPasswordPg } from "@/app/lib/db/core-repo";
import bcrypt from "bcryptjs";

export async function setAccountPassword(tenant: string, email: string, rawPassword: string) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);
    return await setAccountPasswordPg(tenant, email, hashedPassword, false);
  } catch (error) {
    console.error("Failed to set password:", error);
    return { success: false, error: "Something went wrong." };
  }
}

export async function upgradeGuestToUser(tenant: string, email: string, passwordRaw: string) {
  try {
    const hashedPassword = await bcrypt.hash(passwordRaw, 10);
    return await setAccountPasswordPg(tenant, email, hashedPassword, true);
  } catch (error) {
    console.error("Failed to upgrade user:", error);
    return { success: false, error: "Something went wrong." };
  }
}

export async function registerUser(tenant: string, data: any) {
  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return await registerUserPg(tenant, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      hashedPassword,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
