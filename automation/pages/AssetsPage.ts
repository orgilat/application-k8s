import { Page } from '@playwright/test';

export class AssetsPage {
  constructor(private page: Page) {}

  async navigate() { await this.page.goto('/assets'); }
  async waitForLoad() { await this.page.waitForSelector('[data-testid="assets-page"]'); }

  searchInput() { return this.page.locator('[data-testid="search-input"]'); }
  filterType() { return this.page.locator('[data-testid="filter-type"]'); }
  filterCriticality() { return this.page.locator('[data-testid="filter-criticality"]'); }
  filterStatus() { return this.page.locator('[data-testid="filter-status"]'); }
  table() { return this.page.locator('[data-testid="assets-table"]'); }
  createBtn() { return this.page.locator('[data-testid="create-asset-btn"]'); }
  nameInput() { return this.page.locator('[data-testid="input-name"]'); }
  submitCreate() { return this.page.locator('[data-testid="submit-create-asset"]'); }
  row(i: number) { return this.page.locator(`[data-testid="table-row-${i}"]`); }

  async search(text: string) {
    await this.searchInput().fill(text);
    await this.page.waitForTimeout(300);
  }

  async createAsset(name: string) {
    await this.createBtn().click();
    await this.nameInput().fill(name);
    await this.submitCreate().click();
    await this.page.waitForTimeout(500);
  }
}
