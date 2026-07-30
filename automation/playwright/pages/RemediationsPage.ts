import { Page } from '@playwright/test';

export class RemediationsPage {
  constructor(private page: Page) {}

  async navigate() { await this.page.goto('/remediations'); }
  async waitForLoad() { await this.page.waitForSelector('[data-testid="remediations-page"]'); }

  table() { return this.page.locator('[data-testid="remediations-table"]'); }
  row(i: number) { return this.page.locator(`[data-testid="table-row-${i}"]`); }
  approveBtn() { return this.page.locator('[data-testid="approve-btn"]'); }
  startBtn() { return this.page.locator('[data-testid="start-btn"]'); }
}
