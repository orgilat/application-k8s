import { test, expect } from '@playwright/test';
import { FindingsPage } from '../../pages/FindingsPage';

test.describe('Findings', () => {
  test('findings table loads', async ({ page }) => {
    const findings = new FindingsPage(page);
    await findings.navigate();
    await findings.waitForLoad();
    await expect(findings.table()).toBeVisible();
    await expect(findings.row(0)).toBeVisible();
  });

  test('search findings', async ({ page }) => {
    const findings = new FindingsPage(page);
    await findings.navigate();
    await findings.waitForLoad();
    await findings.search('SSH');
    await page.waitForTimeout(500);
    await expect(findings.table()).toBeVisible();
  });

  test('filter by severity', async ({ page }) => {
    const findings = new FindingsPage(page);
    await findings.navigate();
    await findings.waitForLoad();
    await findings.filterSeverity().selectOption('critical');
    await page.waitForTimeout(500);
    await expect(findings.table()).toBeVisible();
  });

  test('filter by status', async ({ page }) => {
    const findings = new FindingsPage(page);
    await findings.navigate();
    await findings.waitForLoad();
    await findings.filterStatus().selectOption('open');
    await page.waitForTimeout(500);
  });

  test('open finding details', async ({ page }) => {
    const findings = new FindingsPage(page);
    await findings.navigate();
    await findings.waitForLoad();
    await findings.row(0).click();
    await page.waitForSelector('[data-testid="finding-details-page"]');
    await expect(page.locator('[data-testid="finding-title"]')).toBeVisible();
  });

  test('acknowledge finding', async ({ page }) => {
    const findings = new FindingsPage(page);
    await findings.navigate();
    await findings.waitForLoad();
    await findings.filterStatus().selectOption('open');
    await page.waitForTimeout(300);
    await findings.row(0).click();
    await page.waitForSelector('[data-testid="finding-details-page"]');

    const ackBtn = page.locator('[data-testid="acknowledge-btn"]');
    if (await ackBtn.isVisible()) {
      await ackBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="finding-status"]')).toContainText('acknowledged');
    }
  });

  test('mark finding false positive', async ({ page }) => {
    const findings = new FindingsPage(page);
    await findings.navigate();
    await findings.waitForLoad();
    await findings.filterStatus().selectOption('open');
    await page.waitForTimeout(300);

    // Navigate to second open finding for FP test
    const rows = await page.locator('[data-testid^="table-row-"]').all();
    if (rows.length > 1) {
      await rows[1].click();
    } else if (rows.length > 0) {
      await rows[0].click();
    }
    await page.waitForSelector('[data-testid="finding-details-page"]');

    const fpBtn = page.locator('[data-testid="false-positive-btn"]');
    if (await fpBtn.isVisible()) {
      await fpBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('reopen finding', async ({ page }) => {
    await page.goto('/findings');
    await page.waitForSelector('[data-testid="findings-page"]');
    await page.locator('[data-testid="filter-status"]').selectOption('acknowledged');
    await page.waitForTimeout(300);

    const row = page.locator('[data-testid="table-row-0"]');
    if (await row.isVisible()) {
      await row.click();
      await page.waitForSelector('[data-testid="finding-details-page"]');
      const reopenBtn = page.locator('[data-testid="reopen-btn"]');
      if (await reopenBtn.isVisible()) {
        await reopenBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('bulk acknowledge findings', async ({ page }) => {
    const findings = new FindingsPage(page);
    await findings.navigate();
    await findings.waitForLoad();
    await findings.filterStatus().selectOption('open');
    await page.waitForTimeout(300);

    await findings.selectAll().click();
    await page.waitForTimeout(200);
    const bulkBtn = findings.bulkAcknowledgeBtn();
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('finding details tabs', async ({ page }) => {
    const findings = new FindingsPage(page);
    await findings.navigate();
    await findings.waitForLoad();
    await findings.row(0).click();
    await page.waitForSelector('[data-testid="finding-details-page"]');

    await page.locator('[data-testid="tab-evidence"]').click();
    await expect(page.locator('[data-testid="finding-evidence"]')).toBeVisible();

    await page.locator('[data-testid="tab-remediation"]').click();
    await expect(page.locator('[data-testid="finding-recommendation"]')).toBeVisible();

    await page.locator('[data-testid="tab-activity"]').click();
  });
});
