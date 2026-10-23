import { Router } from 'express';
export const healthRouter = Router();
healthRouter.get('/', (_req, res) => {
    const mem = process.memoryUsage();
    const response = {
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
