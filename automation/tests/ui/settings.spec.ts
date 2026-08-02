import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('[data-testid="settings-page"]');
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible();
  });

  test('settings form shows organization name', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('[data-testid="settings-page"]');
    await expect(page.locator('[data-testid="org-name-input"]')).toBeVisible();
  });

  test('update settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('[data-testid="settings-page"]');
    await page.locator('[data-testid="org-name-input"]').fill('Updated Org Name');
    await page.locator('[data-testid="save-settings-btn"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="settings-content"]')).toContainText('Updated Org Name');
  });
});
