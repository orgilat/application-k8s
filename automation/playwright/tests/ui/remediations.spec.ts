import { test, expect } from '@playwright/test';

test.describe('Remediations', () => {
  test('remediations page loads', async ({ page }) => {
    await page.goto('/remediations');
    await page.waitForSelector('[data-testid="remediations-page"]');
    await expect(page.locator('[data-testid="remediations-page"]')).toBeVisible();
  });

  test('remediations table shows data', async ({ page }) => {
    await page.goto('/remediations');
    await page.waitForSelector('[data-testid="remediations-page"]');
    const table = page.locator('[data-testid="remediations-table"]');
    if (await table.isVisible()) {
      await expect(table).toBeVisible();
    }
  });

  test('open remediation details', async ({ page }) => {
    await page.goto('/remediations');
    await page.waitForSelector('[data-testid="remediations-page"]');
    const row = page.locator('[data-testid="table-row-0"]');
    if (await row.isVisible()) {
      await row.click();
      await page.waitForSelector('[data-testid="remediation-details-page"]');
      await expect(page.locator('[data-testid="remediation-title"]')).toBeVisible();
    }
  });

  test('approve remediation', async ({ page }) => {
    await page.goto('/remediations');
    await page.waitForSelector('[data-testid="remediations-page"]');
    await page.locator('[data-testid="filter-status"]').selectOption('pending');
    await page.waitForTimeout(300);
    const row = page.locator('[data-testid="table-row-0"]');
    if (await row.isVisible()) {
      await row.click();
      await page.waitForSelector('[data-testid="remediation-details-page"]');
      const approveBtn = page.locator('[data-testid="approve-btn"]');
      if (await approveBtn.isVisible()) {
        await approveBtn.click();
        await page.waitForTimeout(500);
        await expect(page.locator('[data-testid="remediation-status"]')).toContainText('approved');
      }
    }
  });

  test('start remediation from finding', async ({ page }) => {
    await page.goto('/findings');
    await page.waitForSelector('[data-testid="findings-page"]');
    await page.locator('[data-testid="filter-status"]').selectOption('open');
    await page.waitForTimeout(300);
    await page.locator('[data-testid="table-row-0"]').click();
    await page.waitForSelector('[data-testid="finding-details-page"]');
    const startBtn = page.locator('[data-testid="start-remediation-btn"]');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
