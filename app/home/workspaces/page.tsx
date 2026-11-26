import { headers } from "next/headers";
import { auth } from "@/auth";
import { findWorkspacesForEmail } from "@/app/lib/tenant-directory";
import { buildTenantUrl } from "@/app/lib/tenant-utils";
import WorkspacePickerClient, { type PickerWorkspace } from "./WorkspacePickerClient";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: { email?: string; choose?: string };
}) {
  const session = await auth();
  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3001";
  const protocol =
    headerList.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  const sessionEmail = session?.user?.email || null;
  const lookupEmail =
    sessionEmail ||
    (typeof searchParams?.email === "string" ? searchParams.email.trim() : null);

  const { matched, otherTenants } = await findWorkspacesForEmail(lookupEmail || "");

  const matchedWorkspaces: PickerWorkspace[] = matched.map((m) => ({
    slug: m.slug,
    name: m.name,
    role: m.role,
    userName: m.userName,
    dashboardUrl: buildTenantUrl(m.slug, host, protocol, "/"),
    loginUrl: buildTenantUrl(m.slug, host, protocol, "/login"),
    auditionUrl: buildTenantUrl(m.slug, host, protocol, "/audition-form"),
  }));

  const otherWorkspaces: PickerWorkspace[] = otherTenants.map((t) => ({
    slug: t.slug,
    name: t.name,
    dashboardUrl: buildTenantUrl(t.slug, host, protocol, "/"),
    loginUrl: buildTenantUrl(t.slug, host, protocol, "/login"),
    auditionUrl: buildTenantUrl(t.slug, host, protocol, "/audition-form"),
  }));

  return (
    <WorkspacePickerClient
      userEmail={lookupEmail}
      userName={session?.user?.name || null}
      isSignedIn={Boolean(sessionEmail)}
      matchedWorkspaces={matchedWorkspaces}
      otherWorkspaces={otherWorkspaces}
    />
  );
}
