import { Request, Response, NextFunction } from 'express';

import {
  httpErrorsTotal,
  httpRequestDurationSeconds,
  httpRequestsTotal,
} from '../metrics/prometheus';

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationInSeconds = diff[0] + diff[1] / 1e9;

    const route =
      req.route?.path ||
      req.baseUrl ||
      req.path ||
      'unknown';

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }

    httpRequestDurationSeconds.observe(labels, durationInSeconds);
  });

  next();
}