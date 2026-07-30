import path from 'path';

const resultsDir = path.resolve(
  process.env.RESULTS_DIR ?? '../../automation/playwright/results'
);

export const config = {
  port: Number(process.env.PORT ?? 3001),
  environment: process.env.AUTOMATION_ENV ?? 'local',
  resultsDir,
  latestResultsFilePath: path.join(resultsDir, 'latest.json'),
};