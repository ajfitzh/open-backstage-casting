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
});
