import { Request, Response, NextFunction } from 'express';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      type: 'request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
      requestId: (req as any).requestId,
      userId: req.headers['x-user-id'],
    }));
  });
  next();
}
