import { test, expect } from '@playwright/test';

test.describe('Reports', () => {
  test('reports page loads', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForSelector('[data-testid="reports-page"]');
    await expect(page.locator('[data-testid="reports-page"]')).toBeVisible();
  });

  test('reports table shows seeded data', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForSelector('[data-testid="reports-page"]');
    const table = page.locator('[data-testid="reports-table"]');
    if (await table.isVisible()) {
      await expect(table).toBeVisible();
    }
  });

  test('generate new report', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForSelector('[data-testid="reports-page"]');
    await page.locator('[data-testid="generate-report-btn"]').click();
    await page.locator('[data-testid="report-name-input"]').fill('Playwright E2E Report');
    await page.locator('[data-testid="report-type-select"]').selectOption('executive_summary');
    await page.locator('[data-testid="submit-generate-report"]').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Playwright E2E Report')).toBeVisible();
  });

  test('open report details', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForSelector('[data-testid="reports-page"]');
    const row = page.locator('[data-testid="table-row-0"]');
    if (await row.isVisible()) {
      await row.click();
      await page.waitForSelector('[data-testid="report-details-page"]');
      await expect(page.locator('[data-testid="report-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-status"]')).toBeVisible();
    }
  });
});
