import { Router } from 'express';
import { registry } from '../metrics/registry';
import { updateHistoryMetrics } from '../metrics/update-history.metrics';
import { updateLatestRunMetrics } from '../metrics/update-latest-run.metrics';

export const metricsRouter = Router();

metricsRouter.get('/metrics', async (_req, res) => {
  try {
    updateLatestRunMetrics();
    updateHistoryMetrics();

    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        service: 'automation-results-exporter',
        message: 'failed to generate metrics',
        error: error instanceof Error ? error.message : String(error),
      })
    );

    res.status(500).send('failed to generate metrics\n');
  }
});