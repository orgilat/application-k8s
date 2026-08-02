import { test, expect } from '@playwright/test';

const NAV_ITEMS = [
  { testId: 'nav-assets', path: '/assets', pageTestId: 'assets-page' },
  { testId: 'nav-findings', path: '/findings', pageTestId: 'findings-page' },
  { testId: 'nav-scans', path: '/scans', pageTestId: 'scans-page' },
  { testId: 'nav-remediations', path: '/remediations', pageTestId: 'remediations-page' },
  { testId: 'nav-tickets', path: '/tickets', pageTestId: 'tickets-page' },
  { testId: 'nav-reports', path: '/reports', pageTestId: 'reports-page' },
  { testId: 'nav-activity', path: '/activity', pageTestId: 'activity-page' },
  { testId: 'nav-users', path: '/users', pageTestId: 'users-page' },
  { testId: 'nav-settings', path: '/settings', pageTestId: 'settings-page' },
];

test.describe('Navigation', () => {
  test('sidebar is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });

  for (const item of NAV_ITEMS) {
    test(`navigates to ${item.path}`, async ({ page }) => {
      await page.goto('/');
      await page.locator(`[data-testid="${item.testId}"]`).click();
      await page.waitForSelector(`[data-testid="${item.pageTestId}"]`);
      expect(page.url()).toContain(item.path);
    });
  }
});
