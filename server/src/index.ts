import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { translateRoute } from './routes/translate.js';
import { assistantRoute } from './routes/assistant.js';
import { sosRoute } from './routes/sos.js';
import { phrasesRoute } from './routes/phrases.js';
import { healthRoute } from './routes/health.js';
import { liveWebSocketRoute } from './routes/live.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: isProd ? 'info' : 'debug',
      transport: isProd
        ? undefined
        : {
            target: 'pino/file',
            options: { destination: 1 }
          }
    },
    bodyLimit: 1048576, // 1MB max body
    connectionTimeout: 10000,
    keepAliveTimeout: 5000
  });

  // Security Headers Hook
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: https://api.mymemory.translated.net https://generativelanguage.googleapis.com;"
    );
  });

  // Plugins
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  await app.register(compress, {
    global: true,
    threshold: 1024,
    encodings: ['br', 'gzip', 'deflate']
  });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', '::1']
  });

  await app.register(websocket, {
    options: { maxPayload: 1048576 }
  });

  // Register API routes
  await app.register(translateRoute);
  await app.register(assistantRoute);
  await app.register(sosRoute);
  await app.register(phrasesRoute);
  await app.register(healthRoute);
  await app.register(liveWebSocketRoute);

  // Serve static files in production if dist/client exists
  const clientDist = resolve(__dirname, '../../dist/client');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
      cacheControl: true,
      maxAge: 31536000000,
      immutable: true,
      setHeaders: (res, path) => {
        if (path.endsWith('.html') || path.endsWith('sw.js') || path.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
      }
    });

    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html');
    });
  }

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 ConnectPlus Backend running on http://${HOST}:${PORT}`);

    const shutdown = async (signal: string) => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}
