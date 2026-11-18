import { auth } from "@/auth";
import { hasPermission, isAdminRole, isStaffRole, type Permission } from "@/app/lib/permissions";
import { getUserProductionRole } from "@/app/lib/baserow";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = session.user as { id?: string; email?: string | null; name?: string | null; role?: string };
  return {
    id: String(user.id || ""),
    email: user.email || "",
    name: user.name || "",
    role: user.role || "Guest",
  };
}

export async function requireAuthenticatedUser(): Promise<
  { ok: true; user: AuthenticatedUser } | { ok: false; error: string }
> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Unauthorized: please sign in." };
  }
  return { ok: true, user };
}

export async function requirePermission(
  tenant: string,
  permission: Permission,
  productionId?: number
): Promise<{ ok: true; user: AuthenticatedUser } | { ok: false; error: string }> {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult;

  const { user } = authResult;
  if (hasPermission(user.role, null, permission)) {
    return { ok: true, user };
  }

  if (productionId && user.id && !Number.isNaN(Number(user.id))) {
    const prodRole = await getUserProductionRole(tenant, Number(user.id), productionId);
    if (hasPermission(user.role, prodRole, permission)) {
      return { ok: true, user };
    }
  }

  return { ok: false, error: `Forbidden: missing "${permission}" permission.` };
}

export async function requireStaffAccess(): Promise<
  { ok: true; user: AuthenticatedUser } | { ok: false; error: string }
> {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult;

  if (!isStaffRole(authResult.user.role, null)) {
    return { ok: false, error: "Forbidden: staff access required." };
  }
  return { ok: true, user: authResult.user };
}

export async function requireAdminAccess(): Promise<
  { ok: true; user: AuthenticatedUser } | { ok: false; error: string }
> {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult;

  if (!isAdminRole(authResult.user.role)) {
    return { ok: false, error: "Forbidden: administrator access required." };
  }
  return { ok: true, user: authResult.user };
}
