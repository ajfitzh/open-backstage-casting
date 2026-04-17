import { test, expect } from '@playwright/test';

test.describe('Audition Deck & Judge Setup', () => {
  test('forces judge setup before showing the deck', async ({ page }) => {
    // 1. Clear localStorage so the app thinks it's our first time here
    await page.addInitScript(() => window.localStorage.clear());
    
    // Note: If your app requires login first, you'd navigate to login, authenticate, then go to /auditions
    await page.goto('/auditions'); 

    // 2. Verify the Modal is trapping the screen
    await expect(page.getByRole('heading', { name: 'Judge Setup' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Judging' })).toBeDisabled();

    // 3. Fill out the form
    await page.getByPlaceholder('Enter your name').fill('Playwright Tester');
    await page.getByRole('button', { name: 'Director' }).click();
    
    // 4. Submit and verify the main deck renders with our context
    await page.getByRole('button', { name: 'Start Judging' }).click();
    await expect(page.getByText('Audition Deck')).toBeVisible();
    await expect(page.getByText('Playwright Tester • Director')).toBeVisible();
  });

  test('can switch between audition days', async ({ page }) => {
    await page.goto('/auditions');
    
    // Test the tab switching logic we refactored
    await page.getByRole('button', { name: 'Walk-In' }).click();
    await expect(page.getByPlaceholder('Type student name...')).toBeVisible();
  });
});