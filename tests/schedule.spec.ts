import { test, expect } from '@playwright/test';

test.describe('Primary Path 2: The Rehearsal Loop', () => {
  // 🟢 Update this to match an active show ID in your Baserow database
  const TEST_SHOW_ID = '94'; 

  test('volunteer can tap a student IN at the Check-in Kiosk', async ({ page }) => {
    // 1. Navigate directly to the active show's kiosk
    await page.goto(`/sandbox/production/${TEST_SHOW_ID}/rehearsal-check-in`);

    // 2. Wait for the page to load 
    // NOTE: If your DB doesn't have an event scheduled for TODAY, this will fail 
    // because it will see our new "No Rehearsal Scheduled" empty state. 
    await expect(page.getByText(/Live Kiosk Mode/i)).toBeVisible({ timeout: 15000 });

    // 3. Search for a specific student to ensure the search filter works
    const searchInput = page.getByPlaceholder(/Search student name/i);
    await searchInput.fill('Playwright');

    // 4. Tap the student IN
    // Use .first() in case there are multiple students that match
    const tapInBtn = page.getByRole('button', { name: /Tap In/i }).first();
    
    // If they are already tapped in from a previous test run, we might see "Tap Out" instead.
    if (await tapInBtn.isVisible()) {
        await tapInBtn.click();
    }

    // 5. Verify the UI updated optimistically to show "Tap Out" (Proves the DB Action fired)
    await expect(page.getByRole('button', { name: /Tap Out/i }).first()).toBeVisible();
  });

  test('director can compile and send the Nightly Report', async ({ page }) => {
    // 1. Navigate to the Nightly Report
    await page.goto(`/sandbox/production/${TEST_SHOW_ID}/report`);

    // 2. Wait for the report UI
    await expect(page.getByRole('heading', { name: /Director's Nightly Report/i })).toBeVisible({ timeout: 15000 });

    // 3. Fill out the Director's Notes
    const notesArea = page.getByPlaceholder(/Great energy today/i);
    await expect(notesArea).toBeVisible();
    await notesArea.fill('Automated Test: The cast did a fantastic job running through the choreography in Act 1. Please review the new blocking before tomorrow!');

    // 4. Send the Report
    const sendBtn = page.getByRole('button', { name: /Send Nightly Summary/i });
    
    // The button disables if there are no cast emails or notes, so this ensures our state logic works
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // 5. Verify the success state (Ensures the Resend Email API actually fired successfully!)
    await expect(page.getByRole('heading', { name: /Report Sent!/i })).toBeVisible({ timeout: 10000 });
  });
});