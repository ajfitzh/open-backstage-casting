"use server";

import { auth } from "@/auth";
import { isPostgresEnabled } from "@/db";
import { isStaffRole } from "@/app/lib/permissions";
import {
  getPersonProfilePg,
  type PersonProfileData,
} from "@/app/lib/db/person-profile-repo";

export async function getPersonProfileAction(
  tenant: string,
  lookup: { personId?: number | null; name?: string | null; email?: string | null }
): Promise<{ ok: boolean; profile?: PersonProfileData | null; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Sign in required to view person details." };
  }

  if (!isPostgresEnabled()) {
    return { ok: true, profile: null };
  }

  const userRole = (session.user as { role?: string } | undefined)?.role || "Student";
  const includePrivateFields = isStaffRole(userRole);

  try {
    const profile = await getPersonProfilePg(tenant, lookup, includePrivateFields);
    return { ok: true, profile };
  } catch (err) {
    console.error("[PersonProfile] Failed to load profile:", err);
    return { ok: false, error: "Could not load person profile." };
  }
}
