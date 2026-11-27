import { test, expect } from '@playwright/test';

test.describe('API Security & Validation E2E', () => {
  test('POST /api/checkout rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      data: { tenant: 'cytfred', auditionId: 1, productionId: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/upload rejects missing filename and disallowed MIME types', async ({ request }) => {
    const missingRes = await request.post('/api/upload', {
      data: { filename: '', fileType: 'image/png' },
    });
    expect(missingRes.status()).toBe(400);

    const htmlRes = await request.post('/api/upload', {
      data: { filename: 'evil.html', fileType: 'text/html' },
    });
    expect(htmlRes.status()).toBe(400);

    const jsRes = await request.post('/api/upload', {
      data: { filename: 'payload.js', fileType: 'application/javascript' },
    });
    expect(jsRes.status()).toBe(400);
  });

  test('POST /api/upload strips path traversal segments from valid image uploads', async ({ request }) => {
    const res = await request.post('/api/upload', {
      data: { filename: '../../etc/passwd.png', fileType: 'image/png' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.uploadUrl).toBe('string');
    expect(typeof body.publicUrl).toBe('string');
    expect(body.publicUrl).not.toContain('..');
    expect(body.publicUrl).toMatch(/passwd\.png$/);
  });

  test('POST /api/webhooks/stripe rejects missing or invalid signatures', async ({ request }) => {
    const noSig = await request.post('/api/webhooks/stripe', {
      data: JSON.stringify({ id: 'evt_fake' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(noSig.status()).toBeGreaterThanOrEqual(400);

    const badSig = await request.post('/api/webhooks/stripe', {
      data: JSON.stringify({ id: 'evt_fake' }),
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=12345,v1=deadbeef',
      },
    });
    expect(badSig.status()).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/health reports live Neon PostgreSQL connectivity', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.backend).toBe('postgres');
    expect(typeof body.dbLatencyMs).toBe('number');
  });

  test('POST /api/billing/checkout and /api/billing/portal reject unauthenticated requests with 401', async ({ request }) => {
    const checkoutRes = await request.post('/api/billing/checkout', {
      data: { tenant: 'cytfred', planId: 'pro' },
    });
    expect(checkoutRes.status()).toBe(401);

    const portalRes = await request.post('/api/billing/portal', {
      data: { tenant: 'cytfred' },
    });
    expect(portalRes.status()).toBe(401);
  });

  test('GET /api/calendar validates params and returns RFC 5545 .ics calendar feed', async ({ request }) => {
    const missingRes = await request.get('/api/calendar');
    expect(missingRes.status()).toBe(400);

    const validRes = await request.get('/api/calendar?tenant=cytfred&productionId=115');
    expect([200, 404]).toContain(validRes.status());
    if (validRes.status() === 200) {
      expect(validRes.headers()['content-type']).toContain('text/calendar');
      const ics = await validRes.text();
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
    }
  });

  test('POST /api/tickets/checkout validates missing parameters cleanly', async ({ request }) => {
    const res = await request.post('/api/tickets/checkout', {
      data: { tenant: '', performanceId: 0 },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/playbill/pdf rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.get('/api/playbill/pdf?tenant=cytfred&productionId=115');
    expect(res.status()).toBe(401);
  });
});
