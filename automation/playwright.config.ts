import { defineConfig, devices } from '@playwright/test';

const automationRunId =
  process.env.AUTOMATION_RUN_ID ||
  `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['playwright-ctrf-json-reporter', {
      outputDir: 'results/runs',
      outputFile: `${automationRunId}.json`,
    }],
    ['./src/reporters/structuredJsonReporter.ts'],
    ['./src/otel/playwrightOtelReporter.ts'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
