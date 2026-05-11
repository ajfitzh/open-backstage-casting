// tests/guest-auditions.spec.ts
import { test, expect, request } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Force Playwright to load environment variables from the root .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 🟢 Explicitly WIPE the global auth state for this file!
// This guarantees Playwright opens a fresh, unauthenticated browser session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Audition Wizard (Guest to Registered Flow)', () => {

  // 🧹 THE CLEANUP: Runs automatically after the test finishes (pass or fail)
  test.afterAll(async () => {
    console.log('🧹 Running Teardown: Cleaning up E2E database...');
    
    const apiContext = await request.newContext({
      baseURL: process.env.NEXT_PUBLIC_BASEROW_URL || 'https://db.open-backstage.org',
      extraHTTPHeaders: {
        'Authorization': `Token ${process.env.SANDBOX_BASEROW_TOKEN}`,
      }
    });

    // Step A: Find the test user in the PEOPLE table (Table 844 for E2E)
    // Field 8963 = First Name | Field 8964 = Last Name
    const searchRes = await apiContext.get(`/api/database/rows/table/844/?filter_type=AND&filter__field_8963__equal=Playwright&filter__field_8964__equal=Guest`);
    
    if (searchRes.ok()) {
      const searchData = await searchRes.json();

      // Step B: If found, delete them to keep the sandbox pristine!
      if (searchData.results && searchData.results.length > 0) {
        for (const row of searchData.results) {
          const deleteRes = await apiContext.delete(`/api/database/rows/table/844/${row.id}/`);
          if (deleteRes.ok()) {
             console.log(`✅ Successfully deleted Test User ID: ${row.id}`);
          } else {
             const errorText = await deleteRes.text();
             console.error(`❌ Failed to delete Test User ID: ${row.id}. Status: ${deleteRes.status()} - ${errorText}`);
          }
        }
      } else {
        console.log('ℹ️ No test user found to clean up.');
      }
    } else {
      // 🟢 This is the newly added error logging so we can see exactly why it fails!
      const errorText = await searchRes.text();
      console.error(`❌ Failed to fetch test user for teardown. Status: ${searchRes.status()} - ${errorText}`);
    }
  });


  // 🎭 THE GUEST FLOW
  test('completes wizard as a guest and creates a new account', async ({ page }) => {
    
    // Start fresh at the audition form URL
    await page.goto('/audition-form');
    
    // 🟢 1. THE LOGIN GATE (Guest enters email)
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();
    await page.getByPlaceholder('Parent Email').fill('guest-tester@e2e-sandbox.org');
    await page.getByRole('button', { name: /Unlock Profile/i }).click();

    // 🟢 2. THE HUB GATE (Guest clicks register)
    await expect(page.getByRole('heading', { name: /Your Hub/i })).toBeVisible();
    await page.getByRole('button', { name: /Register a Student/i }).click();

    // --- STEP 1: ACTOR INFO ---
    await expect(page.getByText('Step 1/7')).toBeVisible();
    await page.locator('input[type="text"]').first().fill('Playwright Guest');
    await page.locator('input[type="date"]').fill('2012-08-15');
    await page.getByRole('button', { name: '8th' }).click(); 
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 2: CASTING DETAILS ---
    await expect(page.getByText('Step 2/7')).toBeVisible();
    await page.getByRole('button', { name: "5'" }).click(); 
    await page.getByRole('button', { name: '0"', exact: true }).click(); 
    await page.getByRole('button', { name: 'Brown' }).click(); 
    await page.getByRole('checkbox').check(); // "I will accept any role"
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 3: PERFORMANCE ---
    await expect(page.getByText('Step 3/7')).toBeVisible();
    await page.getByRole('button', { name: /Easy-Start Preset/i }).click();
    await page.locator('.grid > div > button').first().click(); // Pick first preset
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 4: AUDITION TIME ---
    await expect(page.getByText('Step 4/7')).toBeVisible();
    await page.locator('button:has-text("Left")').first().click(); // Pick first available slot
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 5: CONFLICTS ---
    await expect(page.getByText('Step 5/7')).toBeVisible();
    await page.getByRole('button', { name: /In-Person/i }).click(); // Callback Availability
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 6: COMMITTEES ---
    await expect(page.getByText('Step 6/7')).toBeVisible();
    await page.locator('select').nth(0).selectOption({ index: 1 });
    await page.locator('select').nth(3).selectOption({ index: 1 });
    await page.getByRole('button', { name: /No thanks/i }).click(); // Chair Interest
    await page.getByRole('button', { name: /Next/i }).click();

    // --- STEP 7: COMMITMENT & ACCOUNT CREATION ---
    await expect(page.getByText('Step 7/7')).toBeVisible();
    
    // Check agreements
    await page.locator('input[type="checkbox"]').nth(0).click(); 
    await page.locator('input[type="checkbox"]').nth(1).click(); 
    
    // Signatures
    await page.getByRole('button', { name: 'Click to Sign' }).first().click();
    await page.getByRole('button', { name: 'Click to Sign' }).click(); // Re-added the .nth(1) here!
    
    // The moment of truth
    await page.getByRole('button', { name: /Submit/i }).click();

    // --- VERIFY SUCCESS ---
    await expect(page.getByRole('heading', { name: /Wish Granted/i })).toBeVisible({ timeout: 15000 });
  });

});