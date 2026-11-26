import { test, expect } from '@playwright/test';

const TENANT_ORIGIN = 'http://cytfred.localhost:3001';

test.describe('Public Audition Form & Authenticated Staff Flows (Read-Only)', () => {
  test('public /audition-form loads unauthenticated with zero runtime errors', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    const res = await page.goto(`${TENANT_ORIGIN}/audition-form`);
    expect(res?.status()).toBeLessThan(400);

    // Should stay on /audition-form (not redirected to /login)
    await expect(page).toHaveURL(/cytfred\.localhost:3001\/audition-form/);
    await expect(page.locator('body')).not.toBeEmpty();
    expect(pageErrors).toEqual([]);
  });

  test('sandbox login rejects wrong password by staying on /sandbox/login', async ({ page }) => {
    await page.goto('/sandbox/login');
    await page.getByPlaceholder(/Enter Desk Password/i).fill('definitely-wrong-password');
    await page.getByRole('button', { name: /Open Desk/i }).click();

    await expect(page).toHaveURL(/\/sandbox\/login$/);
  });

  test('dev-bypass admin login succeeds, redirects /login -> /, and loads all core staff routes cleanly', async ({ page }) => {
    test.setTimeout(60000);

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 1. Sign in via dev-mode-bypass as a synthetic local Admin (does not modify Baserow)
    await page.goto(`${TENANT_ORIGIN}/login`);
    await page.getByPlaceholder(/Email Address/i).fill('e2e-ui-admin@open-backstage.org');
    await page.getByPlaceholder(/Password/i).fill('dev-mode-bypass');
    await page.getByRole('button', { name: /Enter Dashboard/i }).click();

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await expect(page).toHaveURL(/cytfred\.localhost:3001\/?$/);

    // 2. Logged-in user visiting /login should bounce back to /
    await page.goto(`${TENANT_ORIGIN}/login`);
    await expect(page).toHaveURL(/cytfred\.localhost:3001\/?$/);

    // 3. Health-audit core staff & admin routes (zero 500s, zero uncaught page errors)
    const staffRoutes = [
      '/',
      '/production',
      '/season',
      '/reports',
      '/reports/playbill',
      '/analytics',
      '/education',
      '/settings',
    ];

    for (const route of staffRoutes) {
      const response = await page.goto(`${TENANT_ORIGIN}${route}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `Route ${route} returned unexpected status`).toBeLessThan(400);
      await expect(page.locator('body'), `Route ${route} rendered empty body`).not.toBeEmpty();
    }

    expect(pageErrors, `Uncaught page errors across staff routes: ${pageErrors.join('; ')}`).toEqual([]);
  });
});
