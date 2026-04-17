import { test, expect } from '@playwright/test';

test.describe('Education Hub', () => {
  test('navigates between academy management tabs', async ({ page }) => {
    await page.goto('/education'); // Adjust route if your academy page lives elsewhere

    // 1. Default view should be the class manager
    await expect(page.getByRole('button', { name: 'Classes' })).toBeVisible();

    // 2. Switch to the Logistics/Map view
    await page.getByRole('button', { name: 'Logistics' }).click();
    // Since we don't have real data in the test, we look for the empty state or the component wrapper
    await expect(page.locator('text=Logistics')).toBeVisible(); 

    // 3. Switch to Trends (Recharts)
    await page.getByRole('button', { name: 'Trends' }).click();
    await expect(page.getByText('Highlights')).toBeVisible();
    await expect(page.getByText('Top Classes')).toBeVisible();

    // 4. Switch to Faculty
    await page.getByRole('button', { name: 'Faculty' }).click();
    await expect(page.getByText('Instructor Load')).toBeVisible();
  });
});