import { Router, Request, Response } from 'express';
import { HealthResponse } from '../types.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  const response: HealthResponse = {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    timestamp: Date.now(),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024)
    }
  };
  res.json(response);
});
