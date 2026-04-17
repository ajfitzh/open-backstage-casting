import { test, expect } from '@playwright/test';

test.describe('Authentication & Routing', () => {
  test('unauthenticated users are redirected to login', async ({ page }) => {
    // Attempt to access a protected route directly
    await page.goto('/settings');

    // The NextAuth middleware should intercept and bounce us to the login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Verify the login UI rendered
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});