import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  (req as any).userId = (req.headers['x-user-id'] as string) || 'anonymous';
  (req as any).userRole = (req.headers['x-user-role'] as string) || 'viewer';
  next();
}
