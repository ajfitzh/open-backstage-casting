import { test, expect } from '@playwright/test';

test.describe('Check-In Kiosk', () => {
  // We use our seeded show!
  const PRODUCTION_ID = '1'; 

  test('displays empty state when no rehearsal is scheduled', async ({ page }) => {
    // Clean relative path without the tenant prefix
    await page.goto(`/production/${PRODUCTION_ID}/rehearsal-check-in`);

    await expect(page.locator('text=No Rehearsal Scheduled')).toBeVisible();
    await expect(page.locator('text=Enjoy your day off!')).toBeVisible();
    await expect(page.locator('text=Live Kiosk Mode')).not.toBeVisible();
  });
});