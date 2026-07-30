import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';

test.describe('Dashboard', () => {
  test('loads and displays summary cards', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.waitForLoad();

    await expect(dashboard.summaryCards()).toBeVisible();
    await expect(dashboard.statCard('stat-total-assets')).toBeVisible();
    await expect(dashboard.statCard('stat-critical-findings')).toBeVisible();
    await expect(dashboard.statCard('stat-open-findings')).toBeVisible();
    await expect(dashboard.statCard('stat-scans-running')).toBeVisible();
    await expect(dashboard.statCard('stat-remediations-pending')).toBeVisible();
  });

  test('displays recent activity', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.waitForLoad();
    await expect(page.locator('[data-testid="recent-activity-title"]')).toHaveText('Recent Activity');
    await expect(dashboard.recentActivityList()).toBeVisible();
  });

  test('displays top risky assets', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.waitForLoad();
    await expect(dashboard.topRiskyAssetsList()).toBeVisible();
  });

  test('has non-zero stats from seed data', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.waitForLoad();
    const totalAssets = await dashboard.statCard('stat-total-assets').textContent();
    expect(Number(totalAssets?.trim())).toBeGreaterThan(0);
  });
});
