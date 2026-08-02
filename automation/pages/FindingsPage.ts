import { Page } from '@playwright/test';

export class FindingsPage {
  constructor(private page: Page) {}

  async navigate() { await this.page.goto('/findings'); }
  async waitForLoad() { await this.page.waitForSelector('[data-testid="findings-page"]'); }

  searchInput() { return this.page.locator('[data-testid="search-input"]'); }
  filterSeverity() { return this.page.locator('[data-testid="filter-severity"]'); }
  filterStatus() { return this.page.locator('[data-testid="filter-status"]'); }
  table() { return this.page.locator('[data-testid="findings-table"]'); }
  bulkAcknowledgeBtn() { return this.page.locator('[data-testid="bulk-acknowledge-btn"]'); }
  selectAll() { return this.page.locator('[data-testid="select-all"]'); }
  row(i: number) { return this.page.locator(`[data-testid="table-row-${i}"]`); }

  async search(text: string) {
    await this.searchInput().fill(text);
    await this.page.waitForTimeout(300);
  }
}
