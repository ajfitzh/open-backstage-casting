import { test, expect } from '@playwright/test';

test.describe('Primary Path 1: The Audition Lifecycle', () => {

  test.describe('Cast Member Path (Parent Flow)', () => {
    test('can successfully submit the public audition form and sign legal waivers', async ({ page }) => {
      // 1. Clean relative path - Subdomain is handled by config!
      await page.goto('/audition-form');

      await expect(page.getByRole('heading', { name: /Actor Information|Start Your Audition/i })).toBeVisible();
      
      await page.getByLabel(/Full Name/i).fill('Playwright Student');
      await page.getByLabel(/Email/i).fill('test@open-backstage.org');
      
      const nextBtn = page.getByRole('button', { name: /Next/i });
      if (await nextBtn.isVisible()) await nextBtn.click();

      const conductWaiver = page.getByText(/I agree to the Student Conduct/i);
      if (await conductWaiver.isVisible()) await conductWaiver.click();

      const medicalWaiver = page.getByText(/I agree to the Medical Release/i);
      if (await medicalWaiver.isVisible()) await medicalWaiver.click();

      const submitBtn = page.getByRole('button', { name: /Submit|Confirm/i });
      if (await submitBtn.isVisible()) {
          await submitBtn.click();
      }

      await expect(page.locator('text=Confir')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Staff Path (Director Flow)', () => {
    test('forces judge setup before showing the deck', async ({ page }) => {
        await page.goto('/auditions'); 

        await expect(page.getByRole('button', { name: /Audition Deck/i })).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: /Audition Deck/i }).click();

        await expect(page.getByRole('heading', { name: /Judge Setup/i })).toBeVisible();

        await page.getByPlaceholder(/name/i).fill('Playwright Tester');
        await page.getByText(/Director/i).click(); 
        
        const submitBtn = page.getByRole('button', { name: /Start Judging|Update Profile/i });
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();
    });

    test('can switch between audition days', async ({ page }) => {
        await page.goto('/auditions');
        
        await page.getByRole('button', { name: 'Walk-In' }).click();
        await expect(page.getByPlaceholder(/Type student name/i)).toBeVisible();
    });
  });
});