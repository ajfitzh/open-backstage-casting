// app/actions/phase4-ops.ts
"use server";

import { revalidatePath } from "next/cache";
import { isPostgresEnabled } from "@/db";
import { requirePermission } from "@/app/lib/auth-guard";
import {
  approveOnboardingRequestPg,
  getOrganizationBrandingPg,
  listAuditLogsPg,
  listOnboardingRequestsPg,
  updateOrganizationBrandingPg,
} from "@/app/lib/db/phase4-repo";

export async function loadPhase4AdminDataAction(tenant: string) {
  if (!isPostgresEnabled()) {
    return {
      success: false as const,
      error: "PostgreSQL required.",
      branding: null,
      auditLogs: [],
      onboardingRequests: [],
    };
  }
  const guard = await requirePermission(tenant, "view_billing");
  if (!guard.ok) {
    return {
      success: false as const,
      error: guard.error,
      branding: null,
      auditLogs: [],
      onboardingRequests: [],
    };
  }

  const [branding, auditLogs, onboardingRequests] = await Promise.all([
    getOrganizationBrandingPg(tenant),
    listAuditLogsPg(tenant, 30),
    listOnboardingRequestsPg(),
  ]);

  return {
    success: true as const,
    branding,
    auditLogs,
    onboardingRequests,
  };
}

export async function saveOrganizationBrandingAction(
  tenant: string,
  input: {
    primaryColor: string;
    logoUrl: string;
    contactEmail: string;
    websiteUrl: string;
    timezone: string;
    waiverText: string;
    committeeTemplates: string;
  }
) {
  if (!isPostgresEnabled()) {
    return { success: false as const, error: "PostgreSQL required." };
  }
  const guard = await requirePermission(tenant, "view_billing");
  if (!guard.ok) return { success: false as const, error: guard.error };

  const res = await updateOrganizationBrandingPg(tenant, input, {
    email: guard.user.email,
    name: guard.user.name,
  });
  if (res.success) {
    revalidatePath(`/${tenant}/settings`);
    revalidatePath(`/${tenant}/tickets`);
    revalidatePath(`/${tenant}/classes`);
  }
  return res;
}

export async function approveOnboardingRequestAction(tenant: string, requestId: number) {
  if (!isPostgresEnabled()) {
    return { success: false as const, error: "PostgreSQL required." };
  }
  const guard = await requirePermission(tenant, "view_billing");
  if (!guard.ok) return { success: false as const, error: guard.error };

  const res = await approveOnboardingRequestPg(requestId, {
    tenant,
    email: guard.user.email,
    name: guard.user.name,
  });
  if (res.success) {
    revalidatePath(`/${tenant}/settings`);
  }
  return res;
}
