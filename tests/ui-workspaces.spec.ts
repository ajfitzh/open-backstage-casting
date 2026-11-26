import { test, expect } from '@playwright/test';

test.describe('Smart Workspace Router & Org Directory', () => {
  test('lists registered organizations with subdomain Portal Login and Audition Form links', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto('/workspaces?choose=1');
    await expect(page.getByRole('heading', { name: /Choose Your Workspace/i })).toBeVisible();

    // Real tenant pulled from Baserow Master Registry
    const portalLink = page.getByRole('link', { name: /Portal Login/i }).first();
    const auditionLink = page.getByRole('link', { name: /Audition Form/i }).first();

    await expect(portalLink).toBeVisible();
    await expect(auditionLink).toBeVisible();

    const portalHref = await portalLink.getAttribute('href');
    const auditionHref = await auditionLink.getAttribute('href');
    expect(portalHref).toMatch(/^http:\/\/[a-z0-9-]+\.localhost:3001\/login$/);
    expect(auditionHref).toMatch(/^http:\/\/[a-z0-9-]+\.localhost:3001\/audition-form$/);

    expect(pageErrors).toEqual([]);
  });

  test('toggles new organization request form and shows confirmation + toast on submit', async ({ page }) => {
    await page.goto('/workspaces?choose=1');

    // Form is open by default when user has 0 matched orgs; toggle it closed and back open
    const toggleBtn = page.getByRole('button', { name: /Hide Form|Request New Workspace/i });
    await toggleBtn.click();
    await expect(page.getByPlaceholder(/Riverside High Drama Club/i)).toBeHidden();
    await toggleBtn.click();
    await expect(page.getByPlaceholder(/Riverside High Drama Club/i)).toBeVisible();

    await page.getByPlaceholder(/Riverside High Drama Club/i).fill('Starlight Youth Theater');
    await page.getByPlaceholder(/riverside-drama/i).fill('starlight');
    await page.getByPlaceholder(/Your full name/i).fill('Alex Producer');
    await page.getByPlaceholder(/you@school\.org/i).fill('alex@starlight.org');
    await page.getByRole('button', { name: /Request Workspace Setup/i }).click();

    await expect(page.getByText(/Request received for Starlight Youth Theater/i)).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /Organization request sent/i })).toBeVisible();
  });

  test('renders cleanly on mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of ['/', '/login', '/workspaces?choose=1']) {
      await page.goto(path);
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
      });
      expect(hasOverflow, `Unexpected horizontal overflow on ${path}`).toBe(false);
    }
  });
});
