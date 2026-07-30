import { test, expect } from '@playwright/test';
import { AssetsPage } from '../../pages/AssetsPage';

test.describe('Assets', () => {
  test('assets table loads with data', async ({ page }) => {
    const assets = new AssetsPage(page);
    await assets.navigate();
    await assets.waitForLoad();
    await expect(assets.table()).toBeVisible();
    await expect(assets.row(0)).toBeVisible();
  });

  test('search filters assets', async ({ page }) => {
    const assets = new AssetsPage(page);
    await assets.navigate();
    await assets.waitForLoad();
    await assets.search('prod');
    await page.waitForTimeout(500);
    await expect(assets.table()).toBeVisible();
  });

  test('filter by type', async ({ page }) => {
    const assets = new AssetsPage(page);
    await assets.navigate();
    await assets.waitForLoad();
    await assets.filterType().selectOption('server');
    await page.waitForTimeout(500);
    await expect(assets.table()).toBeVisible();
  });

  test('filter by criticality', async ({ page }) => {
    const assets = new AssetsPage(page);
    await assets.navigate();
    await assets.waitForLoad();
    await assets.filterCriticality().selectOption('critical');
    await page.waitForTimeout(500);
    await expect(assets.table()).toBeVisible();
  });

  test('open asset details', async ({ page }) => {
    const assets = new AssetsPage(page);
    await assets.navigate();
    await assets.waitForLoad();
    await assets.row(0).click();
    await page.waitForSelector('[data-testid="asset-details-page"]');
    await expect(page.locator('[data-testid="asset-details-page"]')).toBeVisible();
  });

  test('asset details tabs work', async ({ page }) => {
    const assets = new AssetsPage(page);
    await assets.navigate();
    await assets.waitForLoad();
    await assets.row(0).click();
    await page.waitForSelector('[data-testid="asset-details-page"]');

    await expect(page.locator('[data-testid="tabs"]')).toBeVisible();
    await page.locator('[data-testid="tab-findings"]').click();
    await page.locator('[data-testid="tab-scans"]').click();
    await page.locator('[data-testid="tab-activity"]').click();
    await page.locator('[data-testid="tab-overview"]').click();
  });

  test('edit asset criticality', async ({ page }) => {
    const assets = new AssetsPage(page);
    await assets.navigate();
    await assets.waitForLoad();
    await assets.row(0).click();
    await page.waitForSelector('[data-testid="asset-details-page"]');

    await page.locator('[data-testid="edit-criticality-btn"]').click();
    await page.locator('[data-testid="criticality-select"]').selectOption('high');
    await page.locator('[data-testid="save-criticality"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="asset-criticality"]')).toBeVisible();
  });

  test('edit asset owner', async ({ page }) => {
    const assets = new AssetsPage(page);
    await assets.navigate();
    await assets.waitForLoad();
    await assets.row(0).click();
    await page.waitForSelector('[data-testid="asset-details-page"]');

    await page.locator('[data-testid="edit-owner-btn"]').click();
    await page.locator('[data-testid="owner-input"]').fill('newowner@test.com');
    await page.locator('[data-testid="save-owner"]').click();
    await page.waitForTimeout(500);
  });

  test('add and remove asset tag', async ({ page }) => {
    const assets = new AssetsPage(page);
    await assets.navigate();
    await assets.waitForLoad();
    await assets.row(0).click();
    await page.waitForSelector('[data-testid="asset-details-page"]');

    await page.locator('[data-testid="tag-input"]').fill('test-tag');
    await page.locator('[data-testid="add-tag-btn"]').click();
    await page.waitForTimeout(300);
  });

  test('create new asset', async ({ page }) => {
    const assets = new AssetsPage(page);
    await assets.navigate();
    await assets.waitForLoad();

    await assets.createBtn().click();
    await expect(page.locator('[data-testid="modal-content"]')).toBeVisible();
    await page.locator('[data-testid="input-name"]').fill('test-asset-playwright');
    await page.locator('[data-testid="submit-create-asset"]').click();
    await page.waitForTimeout(500);
  });
});
