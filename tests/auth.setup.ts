import { test as setup, expect } from '@playwright/test';

// Wrap everything to enforce strict sequential execution
setup.describe('Authentication Setup', () => {
  
  // Tell Playwright: "Run these one at a time!"
  setup.describe.configure({ mode: 'serial' });

  const personas = [
    { email: 'james@e2e-sandbox.org', file: 'playwright/.auth/james.json' },
    { email: 'gabriel@e2e-sandbox.org', file: 'playwright/.auth/gabriel.json' },
    { email: 'oliver@e2e-sandbox.org', file: 'playwright/.auth/oliver.json' },
    { email: 'parent@e2e-sandbox.org', file: 'playwright/.auth/parent.json' },
    { email: 'student@e2e-sandbox.org', file: 'playwright/.auth/student.json' },
    { email: 'admin@e2e-sandbox.org', file: 'playwright/.auth/admin.json' },
    { email: 'austin@e2e-sandbox.org', file: 'playwright/.auth/austin.json' },
    { email: 'executive-director@e2e-sandbox.org', file: 'playwright/.auth/executive-director.json' },
    { email: 'business-manager@e2e-sandbox.org', file: 'playwright/.auth/business-manager.json' },
    { email: 'education-coordinator@e2e-sandbox.org', file: 'playwright/.auth/education-coordinator.json' },
    { email: 'active-faculty@e2e-sandbox.org', file: 'playwright/.auth/active-faculty.json' },
    { email: 'faculty-interviewing@e2e-sandbox.org', file: 'playwright/.auth/faculty-interviewing.json' },
    { email: 'faculty-applicant@e2e-sandbox.org', file: 'playwright/.auth/faculty-applicant.json' },
    { email: 'contractor-director@e2e-sandbox.org', file: 'playwright/.auth/director.json' },
    { email: 'contractor-stage-manager@e2e-sandbox.org', file: 'playwright/.auth/stage-manager.json' },
    { email: 'contractor-music-director@e2e-sandbox.org', file: 'playwright/.auth/music-director.json' },
    { email: 'contractor-choreographer@e2e-sandbox.org', file: 'playwright/.auth/choreographer.json' },
    { email: 'contractor-costumer@e2e-sandbox.org', file: 'playwright/.auth/costumer.json' },
    { email: 'production-coordinator@e2e-sandbox.org', file: 'playwright/.auth/production-coordinator.json' },
    { email: 'volunteer@e2e-sandbox.org', file: 'playwright/.auth/volunteer.json' },
    { email: 'committee-team@e2e-sandbox.org', file: 'playwright/.auth/committee-team.json' },
    { email: 'check-in-team@e2e-sandbox.org', file: 'playwright/.auth/check-in-team.json' },
    { email: 'guest@e2e-sandbox.org', file: 'playwright/.auth/guest.json' }
  ];

  for (const { email, file } of personas) {
    setup(`authenticate as ${email}`, async ({ page }) => {
      console.log(`Setting up auth for: ${email}`);
      
      await page.goto('/login');
      await page.getByPlaceholder(/Email Address/i).fill(email);
      await page.getByPlaceholder(/Password/i).fill('dev-mode-bypass');
      await page.getByRole('button', { name: /Enter Dashboard/i }).click();

      await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 10000 });
      await expect(page.getByRole('link', { name: /OPENBACKSTAGE/i }).first()).toBeVisible({ timeout: 10000 });

      await page.context().storageState({ path: file });
    });
  }
});