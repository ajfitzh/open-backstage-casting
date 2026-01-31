// app/lib/actions.ts
"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getClassRoster } from "@/app/lib/baserow";

export async function fetchRosterAction(classId: string) {
  // This runs on the server, keeping your API tokens safe
  const roster = await getClassRoster(classId);
  return roster;
}

export async function switchProduction(formData: FormData) {
  const productionId = formData.get("productionId")?.toString();
  const redirectPath = formData.get("redirectPath")?.toString() || "/dashboard";

  if (productionId) {
    // Set the cookie for 30 days
    (await cookies()).set("active_production_id", productionId, {
      maxAge: 60 * 60 * 24 * 30, 
      path: "/",
    });
  }
  
  redirect(redirectPath);
}