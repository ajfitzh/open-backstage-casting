// tests/director-scoring.spec.ts
import { test, expect, request } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Force Playwright to load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 🟢 Use the Admin cookie jar! 
// We use Admin because they have full read/write access to both the Kiosk and the Audition Deck.
test.use({ storageState: 'playwright/.auth/admin.json' });

let testPersonId: number;
let testAuditionId: number;
let activeProductionId: number = 1;

test.describe('Check-In to Scoring Pipeline', () => {

  test.beforeAll(async () => {
    console.log('🎬 Injecting mock actor for the pipeline test...');
    const apiContext = await request.newContext({
      baseURL: process.env.NEXT_PUBLIC_BASEROW_URL || 'https://db.open-backstage.org',
      extraHTTPHeaders: { 'Authorization': `Token ${process.env.SANDBOX_BASEROW_TOKEN}` }
    });

    // 1. Get the Active Production (Table 845)
    const prodRes = await apiContext.get(`/api/database/rows/table/845/?size=1`);
    if (prodRes.ok()) {
      const prodData = await prodRes.json();
      activeProductionId = prodData.results[0]?.id || 1;
    }

    // 2. Create the Test Actor (Table 844)
    const personRes = await apiContext.post(`/api/database/rows/table/844/`, {
      data: {
        field_8963: "PipelineTest",
        field_8964: "Actor"
      }
    });
    
    if (!personRes.ok()) {
        console.error("❌ Failed to create actor:", await personRes.text());
        return;
    }
    const personData = await personRes.json();
    testPersonId = personData.id;

    // 3. Create the Audition (Table 863)
    // 🔴 NOTICE: We do NOT set field_9246 (Checked In) to true here! 
    // We are going to let the Playwright UI do it.
    const auditionRes = await apiContext.post(`/api/database/rows/table/863/`, {
      data: {
        field_9225: [testPersonId], 
        field_9226: [activeProductionId], 
        field_9254: "Requires early departure", // Lobby Note
      }
    });
    
    if (auditionRes.ok()) {
      const auditionData = await auditionRes.json();
      testAuditionId = auditionData.id;
      console.log(`✅ Injected Actor ID: ${testPersonId} | Audition ID: ${testAuditionId}`);
    }
  });

  test.afterAll(async () => {
    console.log('🧹 Cleaning up Pipeline test data...');
    const apiContext = await request.newContext({
      baseURL: process.env.NEXT_PUBLIC_BASEROW_URL || 'https://db.open-backstage.org',
      extraHTTPHeaders: { 'Authorization': `Token ${process.env.SANDBOX_BASEROW_TOKEN}` }
    });
    
    if (testAuditionId) await apiContext.delete(`/api/database/rows/table/863/${testAuditionId}/`);
    if (testPersonId) await apiContext.delete(`/api/database/rows/table/844/${testPersonId}/`);
  });

  test('Admin can check-in an actor, then immediately score them', async ({ page }) => {
    
    // ==========================================
    // PHASE 1: THE CHECK-IN KIOSK
    // ==========================================
    console.log('➡️ Phase 1: Checking in the actor...');
    await page.goto(`/production/${activeProductionId}/check-in`); 
    
    await expect(page.getByRole('heading', { name: /Check-In/i })).toBeVisible({ timeout: 20000 });
    // 1. Search for the mock actor
    await page.getByPlaceholder(/Search by name/i).fill('PipelineTest');
    
    // 2. Open their modal (Clicking the div that holds their name)
    await page.getByText('PipelineTest Actor').first().click();

    // 3. Verify Modal Opened & click "Verify & Check In"
    const modal = page.locator('.fixed.z-40'); // Based on your z-index in CheckInBoard.tsx
    await expect(modal).toBeVisible();
    await page.getByRole('button', { name: /Verify & Check In/i }).click();

    // 4. Wait for the modal to close and the green badge to appear
    await expect(modal).not.toBeVisible();
    await expect(page.getByText('✓ CHECKED IN')).toBeVisible();


    // ==========================================
    // PHASE 2: THE AUDITION DECK
    // ==========================================
    console.log('➡️ Phase 2: Scoring the actor...');
    await page.goto('/auditions'); 
    
    await expect(page.getByRole('heading', { name: /Audition Deck/i })).toBeVisible();
    
    // Explicitly wait for the data to load
    await expect(page.getByText(/Loading Auditions/i)).not.toBeVisible({ timeout: 15000 });

    // 1. Search for the checked-in actor
    await page.getByPlaceholder(/Find in schedule/i).fill('PipelineTest');
    
    // 2. Click the unmasked actor's row 
    // (If the Check-In failed, this would say "Actor #123" and the test would fail here!)
    await expect(page.getByText('PipelineTest Actor')).toBeVisible({ timeout: 10000 });
    await page.locator('button', { hasText: 'PipelineTest Actor' }).first().click();

    // 3. Verify the Scoring Sidebar opened
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('heading', { name: /PipelineTest Actor/i })).toBeVisible();

    // 4. Fill out the Rubric Sliders (Admin has access to all sliders)
    await page.locator('input[aria-label="Score for Vocal Ability"]').fill('4');
    await page.locator('input[aria-label="Score for Acting / Reads"]').fill('5');
    await page.locator('input[aria-label="Score for Stage Presence"]').fill('4');

    // 5. Add notes
    await page.getByPlaceholder(/Internal notes for/i).fill('Passed the pipeline test!');

    // 6. Save the score
    await page.getByRole('button', { name: /Save Score/i }).click();

    // 7. Verify the sidebar successfully closes 
    await expect(sidebar).not.toBeVisible({ timeout: 5000 });
  });

});