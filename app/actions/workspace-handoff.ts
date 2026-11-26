"use server";

import { headers } from "next/headers";
import { auth } from "@/auth";
import { createHandoffToken } from "@/app/lib/workspace-handoff";
import { buildTenantUrl } from "@/app/lib/tenant-utils";

export async function createWorkspaceLaunchUrl(slug: string): Promise<
  { success: true; url: string } | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: "Please sign in first." };
  }

  const cleanSlug = (slug || "").trim().toLowerCase();
  if (!cleanSlug || !/^[a-z0-9-]+$/.test(cleanSlug)) {
    return { success: false, error: "Invalid organization slug." };
  }

  try {
    const token = createHandoffToken({
      email: session.user.email,
      name: session.user.name,
      tenant: cleanSlug,
    });

    const headerList = await headers();
    const host = headerList.get("host") || "localhost:3001";
    const protocol =
      headerList.get("x-forwarded-proto") ||
      (process.env.NODE_ENV === "production" ? "https" : "http");

    const url = buildTenantUrl(
      cleanSlug,
      host,
      protocol,
      `/api/auth/handoff?token=${encodeURIComponent(token)}`
    );

    return { success: true, url };
  } catch (error) {
    console.error("[createWorkspaceLaunchUrl] Error:", error);
    return { success: false, error: "Could not create workspace login link." };
  }
}
