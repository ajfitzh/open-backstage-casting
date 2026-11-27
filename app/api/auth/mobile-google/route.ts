import { NextRequest } from "next/server";
import { signIn } from "@/auth";
import { extractTenantFromHost } from "@/app/lib/tenant-utils";

function getRequestOrigin(req: NextRequest): string {
  const host = req.headers.get("host") || req.nextUrl.host;
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function sanitizeTenant(raw: string | null): string {
  if (!raw) return "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/**
 * Initiates Google OAuth inside SFSafariViewController for the Capacitor iOS app.
 * NextAuth sets its PKCE/state cookies in SFSafariViewController, redirects to Google,
 * and returns to /api/auth/mobile-complete which bounces back into the native app
 * via the `openbackstage://auth/callback` deep link.
 */
export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const hostTenant = extractTenantFromHost(req.headers.get("host") || "");
  const queryTenant = sanitizeTenant(req.nextUrl.searchParams.get("tenant"));
  const tenant = queryTenant || hostTenant || "";

  const completeUrl = tenant
    ? `${origin}/api/auth/mobile-complete?tenant=${encodeURIComponent(tenant)}`
    : `${origin}/api/auth/mobile-complete`;

  return await signIn("google", { redirectTo: completeUrl });
}
