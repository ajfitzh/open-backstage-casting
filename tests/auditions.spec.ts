// tests/auditions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Primary Path 1: The Audition Lifecycle', () => {

  test.describe('Cast Member Path (Parent Flow)', () => {
    // 🟢 Tell Playwright to use the Parent session we saved in setup!
    test.use({ storageState: 'playwright/.auth/parent.json' });

    test('can successfully submit the public audition form and sign legal waivers', async ({ page }) => {
      // 🟢 Force explicit absolute URL if relative path continues to be flaky in CI
      await page.goto('http://e2e.localhost:3001/audition-form');

      await expect(page.getByRole('heading', { name: /Actor Information|Start Your Audition/i })).toBeVisible();
      
      await page.getByLabel(/Full Name/i).fill('Playwright Student');
      await page.getByLabel(/Email/i).fill('test@open-backstage.org');
      
      const nextBtn = page.getByRole('button', { name: /Next/i });
      if (await nextBtn.isVisible()) await nextBtn.click();

      // ... rest of your test ...
    });
  });

  test.describe('Staff Path (Director Flow)', () => {
    // 🟢 Switch to the Director session!
    test.use({ storageState: 'playwright/.auth/director.json' });

    test('forces judge setup before showing the deck', async ({ page }) => {
        await page.goto('http://e2e.localhost:3001/auditions'); 

        await expect(page.getByRole('button', { name: /Audition Deck/i })).toBeVisible({ timeout: 15000 });
        // ... rest of your test ...
    });
  });
});