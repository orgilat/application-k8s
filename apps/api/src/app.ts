import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestIdMiddleware } from './middleware/requestId';
import { loggerMiddleware } from './middleware/logger';
import { authMiddleware } from './middleware/auth';
import assetRoutes from './modules/assets/routes';
import findingRoutes from './modules/findings/routes';
import scanRoutes from './modules/scans/routes';
import remediationRoutes from './modules/remediations/routes';
import ticketRoutes from './modules/tickets/routes';
import reportRoutes from './modules/reports/routes';
import userRoutes from './modules/users/routes';
import settingsRoutes from './modules/settings/routes';
import dashboardRoutes from './modules/dashboard/routes';
import activityRoutes from './modules/activity/routes';
import simulateRoutes from './modules/simulate/routes';
import metricsRoutes from './metrics/routes';
import { metricsMiddleware } from './middleware/metrics.middleware';
import pool from './db';

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(requestIdMiddleware);
app.use(loggerMiddleware);
app.use(authMiddleware);
app.use(metricsRoutes);
app.use(metricsMiddleware);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api' }));
app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'not ready', db: 'error' });
  }
});

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/findings', findingRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/remediations', remediationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/simulate', simulateRoutes);

export { app };
export default app;
