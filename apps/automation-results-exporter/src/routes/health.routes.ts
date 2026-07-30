import { Router } from 'express';
import { config } from '../config';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'automation-results-exporter',
  });
});

healthRouter.get('/ready', (_req, res) => {
  res.json({
    status: 'ready',
    service: 'automation-results-exporter',
    environment: config.environment,
    resultsDir: config.resultsDir,
    latestResultsFilePath: config.latestResultsFilePath,
  });
});