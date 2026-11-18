// app/lib/tenant-server.ts
import { headers } from 'next/headers';
import { extractTenantFromHost } from './tenant-utils';

export async function resolveTenant(explicitTenant?: string | null): Promise<string> {
  if (explicitTenant && explicitTenant.trim()) {
    return explicitTenant.trim();
  }

  try {
    const headerList = await headers();
    const host = headerList.get('host') || '';
    const extracted = extractTenantFromHost(host);
    if (extracted) return extracted;
  } catch {
    // Outside request context (e.g., unit tests or build-time)
  }

  return process.env.DEFAULT_TENANT_SLUG || 'cytfred';
}
