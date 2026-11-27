// app/lib/tenant-directory.ts
import { isPostgresEnabled } from '@/db';
import {
  findWorkspacesForEmailPg,
  listOrganizationsPg,
} from '@/app/lib/db/core-repo';

export interface RegisteredTenant {
  slug: string;
  name: string;
  peopleTableId: string | number | null;
}

export interface WorkspaceMatch {
  slug: string;
  name: string;
  role: string;
  userName: string;
}

export async function listRegisteredTenants(): Promise<RegisteredTenant[]> {
  if (!isPostgresEnabled()) return [];
  try {
    return await listOrganizationsPg();
  } catch (error) {
    console.error('[tenant-directory] Failed to list organizations:', error);
    return [];
  }
}

export async function findWorkspacesForEmail(email: string): Promise<{
  matched: WorkspaceMatch[];
  otherTenants: RegisteredTenant[];
}> {
  if (!isPostgresEnabled()) {
    return { matched: [], otherTenants: [] };
  }
  try {
    return await findWorkspacesForEmailPg(email);
  } catch (error) {
    console.error('[tenant-directory] Failed to look up workspaces:', error);
    return { matched: [], otherTenants: [] };
  }
}
