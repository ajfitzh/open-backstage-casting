import { test, expect } from '@playwright/test';

test.describe('Primary Path 2: The Rehearsal Loop', () => {
  // 🟢 Updated to match the Sandbox Summer Trial we seeded
  const TEST_SHOW_ID = '1'; 

  test('volunteer can tap a student IN at the Check-in Kiosk', async ({ page }) => {
    await page.goto(`/production/${TEST_SHOW_ID}/rehearsal-check-in`);

    // ⚠️ REQUIRES A SEEDED EVENT IN BASEROW FOR TODAY
    await expect(page.getByText(/Live Kiosk Mode/i)).toBeVisible({ timeout: 15000 });

    const searchInput = page.getByPlaceholder(/Search student name/i);
    await searchInput.fill('Fitzhugh');

    const tapInBtn = page.getByRole('button', { name: /Tap In/i }).first();
    
    if (await tapInBtn.isVisible()) {
        await tapInBtn.click();
    }

    await expect(page.getByRole('button', { name: /Tap Out/i }).first()).toBeVisible();
  });

  test('director can compile and send the Nightly Report', async ({ page }) => {
    await page.goto(`/production/${TEST_SHOW_ID}/report`);

    await expect(page.getByRole('heading', { name: /Director's Nightly Report/i })).toBeVisible({ timeout: 15000 });

    const notesArea = page.getByPlaceholder(/Great energy today/i);
    await expect(notesArea).toBeVisible();
    await notesArea.fill('Automated Test: The cast did a fantastic job running through the choreography in Act 1. Please review the new blocking before tomorrow!');

    const sendBtn = page.getByRole('button', { name: /Send Nightly Summary/i });
    
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    await expect(page.getByRole('heading', { name: /Report Sent!/i })).toBeVisible({ timeout: 10000 });
  });
});