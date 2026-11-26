import { test, expect } from '@playwright/test';
import { createHandoffToken } from '../app/lib/workspace-handoff';

test.describe('Smart Workspace Router, Dotted Add-Org Card & One-Click Handoff', () => {
  test('lists registered organizations with Audition Form link and Portal button', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto('/workspaces?choose=1');
    await expect(page.getByRole('heading', { name: /Choose Your Workspace/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add new organization/i })).toBeVisible();

    const portalButton = page.getByRole('button', { name: /Portal Login|Open Portal/i }).first();
    const auditionLink = page.getByRole('link', { name: /Audition Form/i }).first();

    await expect(portalButton).toBeVisible();
    await expect(auditionLink).toBeVisible();

    const auditionHref = await auditionLink.getAttribute('href');
    expect(auditionHref).toMatch(/^http:\/\/[a-z0-9-]+\.localhost:3001\/audition-form$/);
    expect(pageErrors).toEqual([]);
  });

  test('opens dotted Add new organization card and shows confirmation + toast on submit', async ({ page }) => {
    await page.goto('/workspaces?choose=1');

    // Form is collapsed behind the dashed "Add new organization" card by default
    await expect(page.getByPlaceholder(/Riverside High Drama Club/i)).toBeHidden();
    await page.getByRole('button', { name: /Add new organization/i }).click();
    await expect(page.getByPlaceholder(/Riverside High Drama Club/i)).toBeVisible();

    await page.getByPlaceholder(/Riverside High Drama Club/i).fill('Starlight Youth Theater');
    await page.getByPlaceholder(/riverside-drama/i).fill('starlight');
    await page.getByPlaceholder(/Your full name/i).fill('Alex Producer');
    await page.getByPlaceholder(/you@school\.org/i).fill('alex@starlight.org');
    await page.getByRole('button', { name: /Request Workspace Setup/i }).click();

    await expect(page.getByText(/Request received for Starlight Youth Theater/i)).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /Organization request sent/i })).toBeVisible();
  });

  test('one-click handoff auto-logs into subdomain without asking to auth twice, and rejects bad tokens', async ({ page }) => {
    // 1. Invalid token must redirect cleanly to /login
    await page.goto('http://cytfred.localhost:3001/api/auth/handoff?token=invalid.token');
    await expect(page).toHaveURL(/cytfred\.localhost:3001\/login\?error=HandoffExpired/);

    // 2. Valid signed handoff token signs directly into cytfred.localhost:3001/ (no second login!)
    const token = createHandoffToken({
      email: 'handoff-e2e@open-backstage.org',
      name: 'Handoff Tester',
      tenant: 'cytfred',
    });

    await page.goto(`http://cytfred.localhost:3001/api/auth/handoff?token=${encodeURIComponent(token)}`);
    await expect(page).toHaveURL(/cytfred\.localhost:3001\/?$/);
    await expect(page.locator('body')).not.toBeEmpty();
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
