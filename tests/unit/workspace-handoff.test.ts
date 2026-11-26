import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHandoffToken, verifyHandoffToken } from '../../app/lib/workspace-handoff.ts';

const TEST_SECRET = 'super-secret-handoff-key-for-unit-tests';

describe('workspace handoff token signing & verification', () => {
  it('signs and verifies a valid tenant-bound handoff token', () => {
    const now = 1_700_000_000_000;
    const token = createHandoffToken(
      { email: 'Director@Example.ORG ', name: 'Austin', tenant: 'CYTFRED' },
      { secret: TEST_SECRET, ttlSeconds: 60, nowMs: now }
    );

    const verified = verifyHandoffToken(token, 'cytfred', {
      secret: TEST_SECRET,
      nowMs: now + 10_000,
    });

    assert.ok(verified);
    assert.equal(verified.email, 'director@example.org');
    assert.equal(verified.name, 'Austin');
    assert.equal(verified.tenant, 'cytfred');
  });

  it('rejects tokens replayed on a different tenant subdomain', () => {
    const now = 1_700_000_000_000;
    const token = createHandoffToken(
      { email: 'director@example.org', tenant: 'cytfred' },
      { secret: TEST_SECRET, nowMs: now }
    );

    const wrongTenant = verifyHandoffToken(token, 'cythouston', {
      secret: TEST_SECRET,
      nowMs: now + 1_000,
    });
    assert.equal(wrongTenant, null);
  });

  it('rejects expired or tampered tokens', () => {
    const now = 1_700_000_000_000;
    const token = createHandoffToken(
      { email: 'director@example.org', tenant: 'cytfred' },
      { secret: TEST_SECRET, ttlSeconds: 30, nowMs: now }
    );

    // Expired after 31 seconds
    assert.equal(
      verifyHandoffToken(token, 'cytfred', { secret: TEST_SECRET, nowMs: now + 31_000 }),
      null
    );

    // Tampered payload
    const [, sig] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ email: 'admin@victim.org', name: 'Admin', tenant: 'cytfred', exp: 9999999999 })
    ).toString('base64url');
    assert.equal(
      verifyHandoffToken(`${forgedPayload}.${sig}`, 'cytfred', { secret: TEST_SECRET, nowMs: now }),
      null
    );
  });
});
