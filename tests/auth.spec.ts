import { test, expect } from '@playwright/test';
// This forces this specific file to start with a clean, logged-out slate
test.use({ storageState: { cookies: [], origins: [] } });
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