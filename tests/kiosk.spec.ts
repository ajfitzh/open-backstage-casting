import { test, expect } from '@playwright/test';

test.describe('Check-In Kiosk', () => {
  test('displays live kiosk mode when a rehearsal is scheduled', async ({ page }) => {
    
    await page.goto('/');
    // Uses Regex (/.../i) to find the button even if the "Upcoming/Active" text changes!
await page.getByRole('button', { name: /Playwright 2: The Musical \(E2E\)/i }).first().click();
await page.getByRole('link', { name: /Daily Check-In/i }).click();

    // 4. Verify the Live Kiosk State instead of the Empty State
    await expect(page.locator('text=Live Kiosk Mode')).toBeVisible();
    await expect(page.locator('text=No Rehearsal Scheduled')).not.toBeVisible();
  });
});