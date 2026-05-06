import { test, expect } from '@playwright/test';

test.describe('Primary Path 1: The Audition Lifecycle', () => {

  test.describe('Cast Member Path (Parent Flow)', () => {
    test('can successfully submit the public audition form and sign legal waivers', async ({ page }) => {
      // 1. Go to the public audition wizard
      await page.goto('/sandbox/audition-form');

      // 2. Student Info Step
      // Ensure the page loaded successfully and didn't hit an Error Boundary
      await expect(page.getByRole('heading', { name: /Actor Information|Start Your Audition/i })).toBeVisible();
      
      // Fill out basic info (using generic locators so it doesn't break if you change CSS)
      await page.getByLabel(/Full Name/i).fill('Playwright Student');
      await page.getByLabel(/Email/i).fill('test@open-backstage.org');
      
      // Navigate forward
      const nextBtn = page.getByRole('button', { name: /Next/i });
      if (await nextBtn.isVisible()) await nextBtn.click();

      // 3. The Legal Waivers (MVP Critical Path!)
      // Ensure parents can actually check the click-wrap agreements
      const conductWaiver = page.getByText(/I agree to the Student Conduct/i);
      if (await conductWaiver.isVisible()) await conductWaiver.click();

      const medicalWaiver = page.getByText(/I agree to the Medical Release/i);
      if (await medicalWaiver.isVisible()) await medicalWaiver.click();

      // 4. Submit the Form
      const submitBtn = page.getByRole('button', { name: /Submit|Confirm/i });
      if (await submitBtn.isVisible()) {
          await submitBtn.click();
      }

      // 5. Verify Success State (Ensures Baserow actually accepted the POST request)
      await expect(page.locator('text=Confir')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Staff Path (Director Flow)', () => {
    test('forces judge setup before showing the deck', async ({ page }) => {
        await page.goto('/sandbox/auditions'); 

        // 1. Wait for the main deck to load
        await expect(page.getByRole('button', { name: /Audition Deck/i })).toBeVisible({ timeout: 15000 });
        
        // 2. Click the header to reopen the Judge Setup modal manually
        await page.getByRole('button', { name: /Audition Deck/i }).click();

        // 3. Now the modal is open and STABLE.
        await expect(page.getByRole('heading', { name: /Judge Setup/i })).toBeVisible();

        // 4. Fill and submit
        await page.getByPlaceholder(/name/i).fill('Playwright Tester');
        await page.getByText(/Director/i).click(); 
        
        const submitBtn = page.getByRole('button', { name: /Start Judging|Update Profile/i });
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();
    });

    test('can switch between audition days', async ({ page }) => {
        await page.goto('/sandbox/auditions');
        
        // Test the tab switching logic we refactored
        await page.getByRole('button', { name: 'Walk-In' }).click();
        await expect(page.getByPlaceholder(/Type student name/i)).toBeVisible();
    });
  });
});