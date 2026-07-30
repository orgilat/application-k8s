import { test, expect } from '@playwright/test';

test.describe('Users', () => {
  test('users page loads', async ({ page }) => {
    await page.goto('/users');
    await page.waitForSelector('[data-testid="users-page"]');
    await expect(page.locator('[data-testid="users-page"]')).toBeVisible();
  });

  test('users table shows seeded users', async ({ page }) => {
    await page.goto('/users');
    await page.waitForSelector('[data-testid="users-page"]');
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="table-row-0"]')).toBeVisible();
  });
});
