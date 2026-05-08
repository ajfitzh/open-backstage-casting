import { test, expect } from '@playwright/test';

test.describe('Education Hub', () => {
  test('navigates between academy management views', async ({ page }) => {
    // Clean path!
    await page.goto('/education');

    await expect(page.getByRole('heading', { name: /Academy Manager/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /All Venues/i })).toBeVisible();

    await page.getByRole('button', { name: 'Venue View' }).click();
    await expect(page.getByRole('button', { name: 'Venue View' })).toBeVisible();

    await page.getByRole('button', { name: 'Analytics' }).click();

    await expect(page.getByText('Total Enrollment')).toBeVisible();
    await expect(page.getByText('Est. Revenue')).toBeVisible();
    await expect(page.getByText(/Venue Utilization/i)).toBeVisible();
    await expect(page.getByText(/Teacher Performance/i)).toBeVisible();
  });
});