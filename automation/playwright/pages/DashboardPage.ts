import { Page } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async navigate() { await this.page.goto('/'); }
  async waitForLoad() { await this.page.waitForSelector('[data-testid="dashboard-page"]'); }

  summaryCards() { return this.page.locator('[data-testid="summary-cards"]'); }
  statCard(testId: string) { return this.page.locator(`[data-testid="${testId}"]`); }
  recentActivityList() { return this.page.locator('[data-testid="recent-activity-list"]'); }
  topRiskyAssetsList() { return this.page.locator('[data-testid="top-risky-assets-list"]'); }
}
