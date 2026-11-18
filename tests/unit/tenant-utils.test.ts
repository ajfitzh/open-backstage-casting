import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractTenantFromHost, formatTenantDisplayName } from '../../app/lib/tenant-utils.ts';

describe('extractTenantFromHost', () => {
  it('extracts subdomain tenant in development on localhost', () => {
    assert.equal(extractTenantFromHost('e2e.localhost:3001', 'development'), 'e2e');
    assert.equal(extractTenantFromHost('cytfred.localhost:3000', 'development'), 'cytfred');
    assert.equal(extractTenantFromHost('localhost:3001', 'development'), null);
    assert.equal(extractTenantFromHost('www.localhost:3000', 'development'), null);
  });

  it('extracts subdomain tenant in production on open-backstage.org', () => {
    assert.equal(extractTenantFromHost('cytfred.open-backstage.org', 'production'), 'cytfred');
    assert.equal(extractTenantFromHost('cythouston.open-backstage.org', 'production'), 'cythouston');
    assert.equal(extractTenantFromHost('open-backstage.org', 'production'), null);
    assert.equal(extractTenantFromHost('www.open-backstage.org', 'production'), null);
  });

  it('returns null for empty or unrelated hosts', () => {
    assert.equal(extractTenantFromHost('', 'production'), null);
    assert.equal(extractTenantFromHost('example.com', 'production'), null);
  });
});

describe('formatTenantDisplayName', () => {
  it('prefers registry display name when available', () => {
    assert.equal(formatTenantDisplayName('cythouston', 'CYT Houston'), 'CYT Houston');
  });

  it('formats known slugs and arbitrary multi-word slugs cleanly', () => {
    assert.equal(formatTenantDisplayName('cytfred'), 'CYT Fredericksburg');
    assert.equal(formatTenantDisplayName('sandbox'), 'Open Backstage');
    assert.equal(formatTenantDisplayName('e2e'), 'Open Backstage E2E');
    assert.equal(formatTenantDisplayName('west-side-theater'), 'West Side Theater');
  });
});
