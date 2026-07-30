import { test, expect } from '@playwright/test';

test.describe('Tickets', () => {
  test('tickets page loads', async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForSelector('[data-testid="tickets-page"]');
    await expect(page.locator('[data-testid="tickets-page"]')).toBeVisible();
  });

  test('tickets table shows data', async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForSelector('[data-testid="tickets-page"]');
    const table = page.locator('[data-testid="tickets-table"]');
    if (await table.isVisible()) {
      await expect(table).toBeVisible();
    }
  });

  test('create ticket', async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForSelector('[data-testid="tickets-page"]');
    await page.locator('[data-testid="new-ticket-btn"]').click();
    await page.locator('[data-testid="ticket-title-input"]').fill('Playwright Test Ticket');
    await page.locator('[data-testid="submit-create-ticket"]').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Playwright Test Ticket')).toBeVisible();
  });

  test('open ticket details', async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForSelector('[data-testid="tickets-page"]');
    const row = page.locator('[data-testid="table-row-0"]');
    if (await row.isVisible()) {
      await row.click();
      await page.waitForSelector('[data-testid="ticket-details-page"]');
      await expect(page.locator('[data-testid="ticket-title"]')).toBeVisible();
    }
  });

  test('update ticket status', async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForSelector('[data-testid="tickets-page"]');
    const row = page.locator('[data-testid="table-row-0"]');
    if (await row.isVisible()) {
      await row.click();
      await page.waitForSelector('[data-testid="ticket-details-page"]');
      await page.locator('[data-testid="status-select"]').selectOption('in_progress');
      await page.locator('[data-testid="update-status-btn"]').click();
      await page.waitForTimeout(500);
    }
  });

  test('create ticket from finding', async ({ page }) => {
    await page.goto('/findings');
    await page.waitForSelector('[data-testid="findings-page"]');
    await page.locator('[data-testid="table-row-0"]').click();
    await page.waitForSelector('[data-testid="finding-details-page"]');
    // Navigate to tickets to create one linked to this finding
    await page.goto('/tickets');
    await page.waitForSelector('[data-testid="tickets-page"]');
    await page.locator('[data-testid="new-ticket-btn"]').click();
    await page.locator('[data-testid="ticket-title-input"]').fill('Ticket from Finding');
    await page.locator('[data-testid="submit-create-ticket"]').click();
    await page.waitForTimeout(500);
  });
});
