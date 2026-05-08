import { test, expect } from '@playwright/test';

// 🟢 1. FORCE LOGOUT: This ensures Playwright doesn't inject our Staff Admin cookies
// because we want to test this exactly as a public parent would see it!
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Audition Wizard (Public Parent Flow)', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Go to the public audition form 
    // (Adjust this route if your form lives at a different URL)
    await page.goto('/audition-form');

    // 2. Pass the "Unlock Profile" gate
    await page.getByPlaceholder(/Parent Email/i).fill('parent@e2e-sandbox.org');
    await page.getByRole('button', { name: /Unlock Profile/i }).click();

    // 3. From the Hub view, click to start the wizard
    await page.getByRole('button', { name: /Register a Student/i }).click();

    // 4. Verify we successfully landed on Step 1 of the Wizard
    await expect(page.getByText('Step 1/7')).toBeVisible();
  });

  test('Bug Fix 1: Prevents ghost registration by requiring fields on Step 1', async ({ page }) => {
    // 🟢 Setup an alert listener to catch the native browser dialog
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept(); // Click "OK" on the alert
    });

    // Try to click Next without filling out the form
    await page.getByRole('button', { name: /Next/i }).click();

    // Verify the alert fired with our specific error message
    expect(alertMessage).toContain('Please fill out your Name, Date of Birth, and Grade');
    
    // Verify the blocker actually worked and we are still trapped on Step 1
    await expect(page.getByText('Step 1/7')).toBeVisible();
  });

  test('Bug Fix 2: Prevents scheduling conflicts on mandatory dates', async ({ page }) => {
    // We have to fast-forward to Step 5 to test the conflict blocker!
    
    // --- Step 1 ---
    await page.locator('input[type="text"]').first().fill('Playwright Student');
    await page.locator('input[type="date"]').fill('2010-01-01');
    await page.getByRole('button', { name: '10th' }).click();
    await page.getByRole('button', { name: /Next/i }).click();

    // --- Step 2 ---
    await page.getByRole('button', { name: "5'" }).click(); // 5 ft
    await page.getByRole('button', { name: '0"' }).click();  // 0 in
    await page.getByRole('button', { name: 'Brown' }).click(); // Hair Color
    await page.getByRole('button', { name: /Next/i }).click();

    // --- Step 3 ---
    await page.getByRole('button', { name: /Easy-Start Preset/i }).click();
    await page.getByRole('button', { name: /Tomorrow \(Annie\)/i }).click();
    await page.getByRole('button', { name: /Next/i }).click();

    // --- Step 4 ---
    // Find the first available time slot button (one that doesn't say "Full") and click it
    await page.locator('button:has-text("Left")').first().click();
    await page.getByRole('button', { name: /Next/i }).click();

    // --- Step 5 (The Test!) ---
    await expect(page.getByText('Step 5/7')).toBeVisible();

    // Setup an alert listener to catch the Mandatory Date blocker
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // Locate the mandatory July 6th row, and try to click the "Absent" button
    const mandatoryRow = page.locator('div').filter({ hasText: 'July 6 (Intensive)' }).first();
    await mandatoryRow.getByRole('button', { name: 'Absent' }).click();

    // Verify Jenny's bug fix worked and threw the alert!
    expect(alertMessage).toContain('mandatory rehearsal');
    
    // Verify the button state didn't actually change to red (Absent)
    await expect(mandatoryRow.getByRole('button', { name: 'Absent' })).not.toHaveClass(/bg-red-600/);
  });
});