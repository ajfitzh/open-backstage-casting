import { test, expect } from '@playwright/test';

test.describe('Check-In Kiosk', () => {
  test('displays empty state when no rehearsal is scheduled', async ({ page }) => {
    
    // 1. Go to the main tenant dashboard
    await page.goto('/');

    // 2. Playwright looks for the specific seeded show card and clicks it
    // (If the card itself is a link, or has the title inside it, this will trigger the navigation)
    await page.getByText('Sandbox Summer Trial').first().click(); 
    
    // 3. Now inside the Production context, click the Rehearsal Check-In button in the sidebar
    await page.getByRole('link', { name: /Rehearsal Check-In/i }).click();

    // 4. Verify the Empty State
    await expect(page.locator('text=No Rehearsal Scheduled')).toBeVisible();
    await expect(page.locator('text=Enjoy your day off!')).toBeVisible();
    await expect(page.locator('text=Live Kiosk Mode')).not.toBeVisible();
  });
});