import { test as setup, expect } from '@playwright/test';

// The file where Playwright will save your authentication cookies
const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 1. Navigate to the login page
  await page.goto('/login');

  // 2. Perform the login steps
  // ⚠️ CHANGE THESE to match your actual login form inputs!
  await page.getByPlaceholder('Email').fill('austin.j.fitzhugh@gmail.com');
  await page.getByPlaceholder('Password').fill('41');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // 3. Wait until the page redirects and loads the dashboard to ensure cookies are set
  await expect(page.getByText('Dashboard')).toBeVisible(); // or whatever text proves you are logged in

  // 4. Save the cookies/tokens to our file
  await page.context().storageState({ path: authFile });
});