// app/lib/actions.ts
"use server";

import { getClassRoster } from "@/app/lib/baserow";

export async function fetchRosterAction(classId: string) {
  // This runs on the server, keeping your API tokens safe
  const roster = await getClassRoster(classId);
  return roster;
}