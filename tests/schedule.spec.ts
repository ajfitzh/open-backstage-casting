import { test, expect } from '@playwright/test';

test.describe('Production Scheduler', () => {
  test('toggles between Calendar, Burn-up, and Callboard views', async ({ page }) => {
    await page.goto('/schedule'); // Adjust to your schedule route

    // 1. Verify Calendar is the default
    await expect(page.getByRole('button', { name: 'Calendar' })).toBeVisible();
    await expect(page.getByText('Friday Evening')).toBeVisible();

    // 2. Test Burn-Up View
    await page.getByRole('button', { name: 'Burn-Up' }).click();
    await expect(page.getByRole('heading', { name: 'Burn-Up Chart' })).toBeVisible();
    await expect(page.getByText('Current Velocity')).toBeVisible();

    // 3. Test Callboard View
    await page.getByRole('button', { name: 'Callboard' }).click();
    await expect(page.getByText('Callboard Generator')).toBeVisible();
    await expect(page.getByText('Important Reminders')).toBeVisible();
  });

  test('auto-scheduler modal opens and closes', async ({ page }) => {
    await page.goto('/schedule');

    // Open Modal
    await page.getByRole('button', { name: 'Auto' }).click();
    await expect(page.getByText('Multi-Track Auto-Scheduler')).toBeVisible();

    // Close Modal via the X button
    await page.locator('.fixed button').first().click(); // Grabs the X close button
    await expect(page.getByText('Multi-Track Auto-Scheduler')).toBeHidden();
  });
});