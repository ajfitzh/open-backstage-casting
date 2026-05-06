import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 1. Go to your login page
  await page.goto('/sandbox/login'); // Change to just '/login' if you aren't using the sandbox tenant prefix

  // 2. Fill credentials
  await page.getByPlaceholder(/Email/i).fill('test@email.com');
  await page.getByPlaceholder(/Password/i).fill('test');

  // 3. Click submit
  await page.getByRole('button', { name: /Enter Deck|Sign In/i }).click();

  // 4. Wait for the URL to specifically NOT be the login page
  await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 10000 });

  // 5. Look for something that ALWAYS exists in your logged-in app shell
  // We know your staff sidebar has a "Schedule" or "Roster" link!
  await expect(page.getByRole('link', { name: /Schedule|Roster|Casting/i }).first()).toBeVisible({ timeout: 10000 });

  // 6. Save the session
  await page.context().storageState({ path: authFile });
});