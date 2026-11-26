// app/lib/tenant-directory.ts
import { getDB } from '@/app/lib/baserow';
import { formatTenantDisplayName } from '@/app/lib/tenant-utils';

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

const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || 'https://api.baserow.io').replace(/\/$/, '');
const MASTER_REGISTRY_TABLE_ID = process.env.NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID;
const API_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;

const HIDDEN_SLUGS = new Set(['e2e', 'sandbox', 'test', 'marketing', 'home', 'www']);

export async function listRegisteredTenants(): Promise<RegisteredTenant[]> {
  if (!MASTER_REGISTRY_TABLE_ID || !API_TOKEN) return [];

  try {
    const url = `${BASE_URL}/api/database/rows/table/${MASTER_REGISTRY_TABLE_ID}/?user_field_names=true&size=100`;
    const res = await fetch(url, {
      headers: { Authorization: `Token ${API_TOKEN}` },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const data = await res.json();
    const rows = Array.isArray(data?.results) ? data.results : [];

    return rows
      .map((row: any): RegisteredTenant | null => {
        const slug = String(row.Slug || row.SLUG || '').trim().toLowerCase();
        if (!slug || HIDDEN_SLUGS.has(slug)) return null;
        return {
          slug,
          name: formatTenantDisplayName(slug, row.Name || row.NAME || null),
          peopleTableId: row.PEOPLE || null,
        };
      })
      .filter((t: RegisteredTenant | null): t is RegisteredTenant => t !== null)
      .sort((a: RegisteredTenant, b: RegisteredTenant) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('[tenant-directory] Failed to list tenants:', error);
    return [];
  }
}

export async function findWorkspacesForEmail(email: string): Promise<{
  matched: WorkspaceMatch[];
  otherTenants: RegisteredTenant[];
}> {
  const tenants = await listRegisteredTenants();
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !API_TOKEN) {
    return { matched: [], otherTenants: tenants };
  }

  const lookups = await Promise.all(
    tenants.map(async (tenant): Promise<WorkspaceMatch | null> => {
      if (!tenant.peopleTableId) return null;
      try {
        const DB = getDB(tenant.slug);
        const F = DB.PEOPLE.FIELDS;
        const params = new URLSearchParams({
          filter_type: 'OR',
          size: '1',
          [`filter__${F.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: cleanEmail,
          [`filter__${F.CYT_NATIONAL_INDIVIDUAL_EMAIL}__equal`]: cleanEmail,
        });

        const res = await fetch(
          `${BASE_URL}/api/database/rows/table/${tenant.peopleTableId}/?${params.toString()}`,
          {
            headers: { Authorization: `Token ${API_TOKEN}` },
            cache: 'no-store',
          }
        );
        if (!res.ok) return null;

        const data = await res.json();
        const person = data?.results?.[0];
        if (!person) return null;

        const rawStatus = person[F.STATUS];
        const roles = Array.isArray(rawStatus)
          ? rawStatus.map((s: any) => s?.value).filter(Boolean)
          : [];
        const primaryRole = roles.includes('Admin')
          ? 'Admin'
          : roles.includes('Executive Director')
            ? 'Executive Director'
            : roles[0] || 'Member';

        const userName =
          person[F.FULL_NAME] ||
          `${person[F.FIRST_NAME] || ''} ${person[F.LAST_NAME] || ''}`.trim() ||
          cleanEmail;

        return {
          slug: tenant.slug,
          name: tenant.name,
          role: primaryRole,
          userName,
        };
      } catch (err) {
        console.error(`[tenant-directory] Lookup failed for ${tenant.slug}:`, err);
        return null;
      }
    })
  );

  const matched = lookups.filter((m): m is WorkspaceMatch => m !== null);
  const matchedSlugs = new Set(matched.map((m) => m.slug));
  const otherTenants = tenants.filter((t) => !matchedSlugs.has(t.slug));

  return { matched, otherTenants };
}
