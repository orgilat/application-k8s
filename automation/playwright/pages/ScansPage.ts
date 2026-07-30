import { Page } from '@playwright/test';

export class ScansPage {
  constructor(private page: Page) {}

  async navigate() { await this.page.goto('/scans'); }
  async waitForLoad() { await this.page.waitForSelector('[data-testid="scans-page"]'); }

  newScanBtn() { return this.page.locator('[data-testid="new-scan-btn"]'); }
  scanNameInput() { return this.page.locator('[data-testid="scan-name-input"]'); }
  scanTypeSelect() { return this.page.locator('[data-testid="scan-type-select"]'); }
  submitNewScan() { return this.page.locator('[data-testid="submit-new-scan"]'); }
  table() { return this.page.locator('[data-testid="scans-table"]'); }
  row(i: number) { return this.page.locator(`[data-testid="table-row-${i}"]`); }

  async createScan(name: string, type?: string) {
    await this.newScanBtn().click();
    await this.scanNameInput().fill(name);
    if (type) await this.scanTypeSelect().selectOption(type);
    await this.submitNewScan().click();
    await this.page.waitForTimeout(500);
  }
}
