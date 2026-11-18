import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;

type TenantConfigModule = typeof import('../../app/lib/tenant-config.ts');

function loadTenantConfig(tag: string): Promise<TenantConfigModule> {
  const url = new URL(`../../app/lib/tenant-config.ts?${tag}`, import.meta.url).href;
  return import(url) as Promise<TenantConfigModule>;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('getTenantTableConfig', () => {
  it('throws when NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID is not configured', async () => {
    delete process.env.NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID;
    const { getTenantTableConfig } = await loadTenantConfig('no-env');

    await assert.rejects(
      () => getTenantTableConfig('cytfred'),
      /Missing NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID/
    );
  });

  it('returns dummy config for system and marketing slugs without calling fetch', async () => {
    process.env.NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID = '999';
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called');
    }) as typeof fetch;

    const { getTenantTableConfig } = await loadTenantConfig('system-slugs');

    for (const slug of ['', 'home', 'www', 'login', 'api', 'marketing']) {
      const cfg = await getTenantTableConfig(slug);
      assert.equal(cfg.PEOPLE, '0');
      assert.equal(cfg.AUDITION_SLOTS, '0');
    }
    assert.equal(fetchCalled, false);
  });

  it('maps Baserow master registry row fields, aliases, and AUDITION_SLOTS fallback', async () => {
    process.env.NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID = '999';
    process.env.NEXT_PUBLIC_BASEROW_URL = 'https://db.example.test/';
    process.env.BASEROW_API_TOKEN = 'test-token';

    let requestedUrl = '';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(
        JSON.stringify({
          results: [
            {
              Name: 'CYT Fredericksburg',
              PEOPLE: 599,
              PRODUCTIONS: 601,
              AUDITIONS: 630,
              COMMITTEE_REPORTS: 773,
              RATES: 700,
              SESSIONS: 632,
              ROLES: 605,
              SLOTS: 610,
              RESOURCES: 615,
              TEAM_ASSIGNMENTS: 622,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const { getTenantTableConfig } = await loadTenantConfig('mapped-row');
    const cfg = await getTenantTableConfig('cytfred');

    assert.match(requestedUrl, /^https:\/\/db\.example\.test\/api\/database\/rows\/table\/999\/\?filter__Slug__equal=cytfred/);
    assert.equal(cfg.TENANT_NAME, 'CYT Fredericksburg');
    assert.equal(cfg.PEOPLE, 599);
    assert.equal(cfg.PRODUCTIONS, 601);
    assert.equal(cfg.AUDITIONS, 630);
    assert.equal(cfg.COMMITTEE_REPORTS, 773);
    // Aliases
    assert.equal(cfg.RENTAL_RATES, 700);
    assert.equal(cfg.SEASONS, 632);
    assert.equal(cfg.BLUEPRINT_ROLES, 605);
    assert.equal(cfg.SCHEDULE_SLOTS, 610);
    assert.equal(cfg.ASSETS, 615);
    assert.equal(cfg.SHOW_TEAM, 622);
    // Fallback when AUDITION_SLOTS is omitted
    assert.equal(cfg.AUDITION_SLOTS, 772);
  });

  it('throws when the tenant slug is not found in the registry', async () => {
    process.env.NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID = '999';
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ results: [] }), { status: 200 })) as typeof fetch;

    const { getTenantTableConfig } = await loadTenantConfig('missing-tenant');

    await assert.rejects(
      () => getTenantTableConfig('nonexistent'),
      /Tenant "nonexistent" not found/
    );
  });
});
