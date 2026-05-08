import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 1. Go straight to login (baseURL handles the subdomain)
  await page.goto('/login');

  // 2. Fill credentials 
  await page.getByPlaceholder(/Email Address/i).fill('admin@e2e-sandbox.org');
  await page.getByPlaceholder(/Password/i).fill('dev-mode-bypass');

  // 3. Click submit
  await page.getByRole('button', { name: /Enter Dashboard/i }).click();

  // 4. Wait for the URL to specifically NOT be the login page
  await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 10000 });

  // 5. Verify we landed somewhere inside the app
  await expect(page.getByRole('link', { name: /Schedule|Roster|Casting|Dashboard/i }).first()).toBeVisible({ timeout: 10000 });

  // 6. Save the session
  await page.context().storageState({ path: authFile });
});