import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { HealthResponse } from '../types.js';

export async function healthRoute(app: FastifyInstance) {
  app.get('/api/v1/health', async (_request: FastifyRequest, reply: FastifyReply) => {
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
    return reply.send(response);
  });
}
