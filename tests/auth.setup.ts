import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');

  // 1. Match your specific placeholders
  await page.getByPlaceholder('Email Address').fill('test@email.com');
  await page.getByPlaceholder('App Password').fill('test');

  // 2. Click the EXACT button name from your code
  await page.getByRole('button', { name: 'Enter Deck' }).click();

  // 3. Wait for the app to land on the dashboard
  // (Adjust the text 'Dashboard' to something that actually exists on your home page)
  await page.waitForURL('**/'); 
 await expect(page.getByText(/dashboard|staff portal|war room/i).first()).toBeVisible({ timeout: 10000 });
  // 4. Save the session
  await page.context().storageState({ path: authFile });
});