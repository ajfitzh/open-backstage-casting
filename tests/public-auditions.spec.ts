import { test, expect } from '@playwright/test';

// Use the Parent persona!
test.use({ storageState: 'playwright/.auth/parent.json' });

test.describe('Audition Wizard (Parent Flow)', () => {

  test('completes the 7-step audition wizard and successfully submits to Baserow', async ({ page }) => {
    
    await page.goto('/audition-form');
    
    // --- HUB VIEW ---
    // Because we are using the parent.json cookie, the portal recognizes us instantly!
    // We completely skip the Email login screen and click straight into the wizard.
    await page.getByRole('button', { name: /Register a Student/i }).click();

    // --- STEP 1: ACTOR INFO ---
    await expect(page.getByText('Step 1/7')).toBeVisible();
    await page.locator('input[type="text"]').first().fill('Playwright Kid');
    await page.locator('input[type="date"]').fill('2010-05-10');
    await page.getByRole('button', { name: '10th' }).click(); // Select Grade
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 2: CASTING DETAILS ---
    await expect(page.getByText('Step 2/7')).toBeVisible();
    await page.getByRole('button', { name: "5'" }).click(); // 5 ft
    await page.getByRole('button', { name: '0"', exact: true }).click(); // 0 in
    await page.getByRole('button', { name: 'Brown' }).click(); // Hair Color
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 3: PERFORMANCE ---
    await expect(page.getByText('Step 3/7')).toBeVisible();
    await page.getByRole('button', { name: /Easy-Start Preset/i }).click();
    await page.locator('.grid > div > button').first().click(); // Pick first preset
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 4: AUDITION TIME ---
    await expect(page.getByText('Step 4/7')).toBeVisible();
    // FREEZE TIME: Let's look at the screen!
    await page.pause();
    await page.locator('button:has-text("Left")').first().click(); // Pick first available slot
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 5: CONFLICTS ---
    await expect(page.getByText('Step 5/7')).toBeVisible();
    await page.getByRole('button', { name: /I will accept any role/i }).click();
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 6: COMMITTEES ---
    await expect(page.getByText('Step 6/7')).toBeVisible();
    await page.locator('select').nth(0).selectOption({ index: 1 });
    await page.locator('select').nth(1).selectOption({ index: 1 });
    await page.getByRole('button', { name: /No, not this show/i }).click(); // Chair interest
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 7: COMMITMENT ---
    await expect(page.getByText('Step 7/7')).toBeVisible();
    await page.locator('input[type="checkbox"]').nth(0).click(); 
    await page.locator('input[type="checkbox"]').nth(1).click(); 
    
    // The moment of truth
    await page.getByRole('button', { name: /Submit/i }).click();

    // --- VERIFY SUCCESS ---
    await expect(page.getByRole('heading', { name: /Wish Granted/i })).toBeVisible({ timeout: 15000 });
  });

});