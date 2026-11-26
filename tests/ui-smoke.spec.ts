import { test, expect } from '@playwright/test';

test.describe('End-to-End UI Smoke Suite', () => {
  test('marketing homepage renders and navigates to Find Your Workspace login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Your Theater/i })).toBeVisible();
    await page.getByRole('link', { name: /Sign In/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /Find Your Workspace/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('email workspace lookup routes to /workspaces and supports new org request form', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('new-director@example.org');
    await page.getByRole('button', { name: /Locate My Organization/i }).click();

    await expect(page).toHaveURL(/\/workspaces\?email=new-director%40example\.org/);
    await expect(page.getByRole('heading', { name: /Choose Your Workspace/i })).toBeVisible();
    await expect(page.getByText('new-director@example.org', { exact: true })).toBeVisible();

    // Open the dotted "+ Add new organization" card and submit an onboarding request
    await page.getByRole('button', { name: /Add new organization/i }).click();
    await page.getByPlaceholder(/Riverside High Drama Club/i).fill('Playwright Performing Arts');
    await page.getByPlaceholder(/riverside-drama/i).fill('playwright-arts');
    await page.getByPlaceholder(/Your full name/i).fill('Test Director');
    await page.getByRole('button', { name: /Request Workspace Setup/i }).click();

    await expect(page.getByText(/Request received for Playwright Performing Arts/i)).toBeVisible();
  });

  test('tenant subdomain login renders and protects private routes', async ({ page }) => {
    await page.goto('http://cytfred.localhost:3001/settings');
    await expect(page).toHaveURL(/cytfred\.localhost:3001\/login/);
    await expect(page.getByPlaceholder(/Email Address/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Enter Dashboard/i })).toBeVisible();
  });

  test('sandbox gate redirects unauthenticated visitors to /sandbox/login', async ({ page }) => {
    await page.goto('/sandbox');
    await expect(page).toHaveURL(/\/sandbox\/login$/);
  });

  test('legal pages load cleanly on main domain', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.goto('/terms');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
