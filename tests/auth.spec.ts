// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

setup.describe('Authentication Setup', () => {
  setup.describe.configure({ mode: 'serial' });

  // 🟢 REDUCED TO ONLY WHAT WE NEED FOR AUDITION WORLD
  const personas = [
    { email: 'admin@e2e-sandbox.org', file: 'playwright/.auth/admin.json' },
    { email: 'contractor-director@e2e-sandbox.org', file: 'playwright/.auth/director.json' },
    { email: 'parent@e2e-sandbox.org', file: 'playwright/.auth/parent.json' },
  ];

  for (const { email, file } of personas) {
    setup(`authenticate as ${email}`, async ({ page }) => {
      console.log(`Setting up auth for: ${email}`);
      
      await page.goto('/login');
      await page.getByPlaceholder(/Email Address/i).fill(email);
      await page.getByPlaceholder(/Password/i).fill('dev-mode-bypass');
      await page.getByRole('button', { name: /Enter Dashboard/i }).click();

      // Increased timeout slightly for GitHub Actions safety
      await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15000 });
      await expect(page.getByRole('link', { name: /OPENBACKSTAGE/i }).first()).toBeVisible({ timeout: 15000 });

      await page.context().storageState({ path: file });
    });
  }
});