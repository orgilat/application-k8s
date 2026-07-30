import { Router } from 'express';
import { registry } from './prometheus';

const router = Router();

router.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

export default router;