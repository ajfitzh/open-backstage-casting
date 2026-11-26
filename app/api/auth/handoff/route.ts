import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { extractTenantFromHost } from "@/app/lib/tenant-utils";
import { verifyHandoffToken } from "@/app/lib/workspace-handoff";

function getRequestOrigin(req: NextRequest): string {
  const host = req.headers.get("host") || req.nextUrl.host;
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const token = req.nextUrl.searchParams.get("token") || "";
  const host = req.headers.get("host") || "";
  const tenant = extractTenantFromHost(host);

  if (!tenant || !token) {
    return NextResponse.redirect(`${origin}/login?error=HandoffMissing`);
  }

  const verified = verifyHandoffToken(token, tenant);
  if (!verified) {
    return NextResponse.redirect(`${origin}/login?error=HandoffExpired`);
  }

  try {
    await signIn("credentials", {
      handoffToken: token,
      redirect: false,
    });

    return NextResponse.redirect(`${origin}/`);
  } catch (error) {
    console.error("[api/auth/handoff] Sign-in handoff failed:", error);
    return NextResponse.redirect(`${origin}/login?error=HandoffFailed`);
  }
}
