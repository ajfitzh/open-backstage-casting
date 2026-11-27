import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractTenantFromHost } from "@/app/lib/tenant-utils";
import { createHandoffToken } from "@/app/lib/workspace-handoff";

function sanitizeTenant(raw: string | null): string {
  if (!raw) return "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function escapeHtml(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Completes Google OAuth inside SFSafariViewController for the Capacitor iOS app.
 * Mints a short-lived HMAC-signed handoff token and redirects to the native app via
 * `openbackstage://auth/callback?...`.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    const errorUrl = "openbackstage://auth/callback?error=GoogleAuthFailed";
    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#09090b;color:#f4f4f5;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;"><div><h2>Sign-in could not be completed</h2><p style="color:#a1a1aa">Please return to Open Backstage and try again.</p><a href="${errorUrl}" style="display:inline-block;margin-top:16px;padding:12px 20px;background:#2563eb;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;">Return to App</a></div><script>window.location.replace(${JSON.stringify(errorUrl)});</script></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const hostTenant = extractTenantFromHost(req.headers.get("host") || "");
  const queryTenant = sanitizeTenant(req.nextUrl.searchParams.get("tenant"));
  const tenant = queryTenant || hostTenant || "";

  const token = createHandoffToken(
    {
      email,
      name: session?.user?.name || email,
      tenant: tenant || "__main__",
    },
    { ttlSeconds: 120 }
  );

  const deepLink = tenant
    ? `openbackstage://auth/callback?mode=tenant&tenant=${encodeURIComponent(tenant)}&token=${encodeURIComponent(token)}`
    : `openbackstage://auth/callback?mode=main&token=${encodeURIComponent(token)}`;

  const safeHref = escapeHtml(deepLink);

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Returning to Open Backstage...</title>
  </head>
  <body style="margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;text-align:center;">
    <div style="max-width:340px;background:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:28px 24px;">
      <h1 style="font-size:18px;margin:0 0 8px;">Signed in!</h1>
      <p style="font-size:13px;color:#a1a1aa;margin:0 0 20px;line-height:1.5;">
        Returning you to Open Backstage now...
      </p>
      <a href="${safeHref}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;border-radius:12px;padding:12px 20px;font-size:13px;font-weight:700;">
        Open Backstage App
      </a>
    </div>
    <script>
      window.location.replace(${JSON.stringify(deepLink)});
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
