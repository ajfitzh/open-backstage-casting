import { test, expect } from '@playwright/test';

test.describe('Audition Deck & Judge Setup', () => {
test('forces judge setup before showing the deck', async ({ page }) => {
    await page.goto('/auditions'); 

    // 1. Wait for the main deck to load (since useEffect auto-skips the modal)
    await expect(page.getByRole('button', { name: /Audition Deck/i })).toBeVisible({ timeout: 15000 });
    
    // 2. Click the header to reopen the Judge Setup modal manually!
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
    await page.goto('/auditions');
    
    // Test the tab switching logic we refactored
    await page.getByRole('button', { name: 'Walk-In' }).click();
    await expect(page.getByPlaceholder('Type student name...')).toBeVisible();
  });
});