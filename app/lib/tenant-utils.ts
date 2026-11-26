// app/lib/tenant-utils.ts
// Pure, client-safe and test-safe tenant helpers (no next/headers dependency)

export function extractTenantFromHost(
  host: string,
  nodeEnv: string = process.env.NODE_ENV || 'development'
): string | null {
  if (!host) return null;

  const currentHost = host.split(':')[0].trim().toLowerCase();
  if (!currentHost) return null;

  if (nodeEnv !== 'production' && (currentHost === 'localhost' || currentHost.endsWith('.localhost'))) {
    if (currentHost === 'localhost') {
      return null;
    }
    const sub = currentHost.slice(0, -'.localhost'.length);
    return sub && sub !== 'www' ? sub : null;
  }

  const baseHost = nodeEnv === 'production' ? 'open-backstage.org' : 'localhost';
  if (currentHost === baseHost || currentHost === `www.${baseHost}`) {
    return null;
  }

  const suffix = `.${baseHost}`;
  if (currentHost.endsWith(suffix)) {
    const sub = currentHost.slice(0, -suffix.length);
    return sub && sub !== 'www' ? sub : null;
  }

  return null;
}

export function formatTenantDisplayName(slug: string, registryName?: string | null): string {
  if (registryName && registryName.trim()) {
    return registryName.trim();
  }

  const normalized = (slug || '').trim().toLowerCase();
  if (!normalized || normalized === 'sandbox' || normalized === 'default') {
    return 'Open Backstage';
  }
  if (normalized === 'cytfred') {
    return 'CYT Fredericksburg';
  }
  if (normalized === 'e2e') {
    return 'Open Backstage E2E';
  }

  return normalized
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildTenantUrl(
  slug: string,
  currentHost: string,
  protocol: string = 'https',
  path: string = '/'
): string {
  const cleanSlug = slug.trim().toLowerCase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const [rawHostname, port] = (currentHost || '').split(':');
  const hostname = (rawHostname || '').trim().toLowerCase();

  if (hostname === 'localhost' || hostname.endsWith('.localhost') || !hostname) {
    const portSuffix = port ? `:${port}` : ':3001';
    return `http://${cleanSlug}.localhost${portSuffix}${cleanPath}`;
  }

  const baseHost = hostname.startsWith('www.')
    ? hostname.slice(4)
    : hostname.endsWith('.open-backstage.org')
      ? 'open-backstage.org'
      : hostname;
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}://${cleanSlug}.${baseHost}${portSuffix}${cleanPath}`;
}
