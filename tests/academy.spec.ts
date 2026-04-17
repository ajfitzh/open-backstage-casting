import { test, expect } from '@playwright/test';

test.describe('Education Hub', () => {
  test('navigates between academy management views', async ({ page }) => {
    // 1. Load the page
    await page.goto('/education');

    // 2. Verify Default State (Grid View)
    // Check for the main header to ensure the page loaded
    await expect(page.getByRole('heading', { name: /Academy Manager/i })).toBeVisible();
    
    // Check for the "All Venues" filter pill which renders in Grid/Venue views
    await expect(page.getByRole('button', { name: /All Venues/i })).toBeVisible();

    // 3. Switch to Venue View (Campus Mode)
    // Playwright reads the title="Venue View" attribute on your icon button!
    await page.getByRole('button', { name: 'Venue View' }).click();
    
    // We just verify it didn't crash and the button is still there
    await expect(page.getByRole('button', { name: 'Venue View' })).toBeVisible();

    // 4. Switch to Analytics View (Metrics Mode)
    await page.getByRole('button', { name: 'Analytics' }).click();

    // 5. Verify Analytics/Metrics UI renders correctly
    // These match the exact static text inside your MetricCards and section headings
    await expect(page.getByText('Total Enrollment')).toBeVisible();
    await expect(page.getByText('Est. Revenue')).toBeVisible();
    await expect(page.getByText(/Venue Utilization/i)).toBeVisible();
    await expect(page.getByText(/Teacher Performance/i)).toBeVisible();
  });
});