import express from 'express';
import { healthRouter } from './routes/health.routes';
import { metricsRouter } from './routes/metrics.routes';

export const app = express();

app.use(express.json());

app.use(healthRouter);
app.use(metricsRouter);