import { test, expect } from '@playwright/test';
import { ScansPage } from '../../pages/ScansPage';

test.describe('Scans', () => {
  test('scans page loads', async ({ page }) => {
    const scans = new ScansPage(page);
    await scans.navigate();
    await scans.waitForLoad();
    await expect(page.locator('[data-testid="scans-page"]')).toBeVisible();
  });

  test('scans table shows data', async ({ page }) => {
    const scans = new ScansPage(page);
    await scans.navigate();
    await scans.waitForLoad();
    await expect(scans.table()).toBeVisible();
  });

  test('create new scan', async ({ page }) => {
    const scans = new ScansPage(page);
    await scans.navigate();
    await scans.waitForLoad();

    await scans.createScan('Playwright Test Scan', 'vulnerability_scan');
    await expect(scans.table()).toBeVisible();
  });

  test('scan appears in list after creation', async ({ page }) => {
    const scans = new ScansPage(page);
    await scans.navigate();
    await scans.waitForLoad();

    await scans.newScanBtn().click();
    await scans.scanNameInput().fill('E2E Scan Test');
    await scans.submitNewScan().click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('E2E Scan Test')).toBeVisible();
  });

  test('open scan details page', async ({ page }) => {
    const scans = new ScansPage(page);
    await scans.navigate();
    await scans.waitForLoad();
    await scans.row(0).click();
    await page.waitForSelector('[data-testid="scan-details-page"]');
    await expect(page.locator('[data-testid="scan-status"]')).toBeVisible();
  });
});
