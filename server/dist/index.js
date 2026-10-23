import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { healthRouter } from './routes/health.js';
import { translateRouter } from './routes/translate.js';
import { assistantRouter } from './routes/assistant.js';
import { sosRouter } from './routes/sos.js';
import { phrasesRouter } from './routes/phrases.js';
import { setupLiveWebSocket } from './routes/live.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
export function buildApp() {
    const app = express();
    const server = createServer(app);
    // Security Headers via Helmet
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
                connectSrc: [
                    "'self'",
                    'ws:',
                    'wss:',
                    'https://api.mymemory.translated.net',
                    'https://generativelanguage.googleapis.com',
                    'https://api.twilio.com'
                ]
            }
        },
        crossOriginEmbedderPolicy: false
    }));
    // Additional security headers
    app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
    // CORS
    app.use(cors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }));
    // Body Parsing
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    // General Rate Limiter
    const generalLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 120,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests, please try again later.' }
    });
    app.use('/api/', generalLimiter);
    // Specific Route Rate Limiters
    const sosLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 15,
        message: { error: 'Rate limit exceeded for SOS requests. Please wait a minute.' }
    });
    const translateLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 60,
        message: { error: 'Rate limit exceeded for translations. Please slow down.' }
    });
    const assistantLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 40,
        message: { error: 'Rate limit exceeded for assistant queries. Please wait a moment.' }
    });
    // Mount API Routes
    app.use('/api/v1/health', healthRouter);
    app.use('/api/v1/sos', sosLimiter, sosRouter);
    app.use('/api/v1/translate', translateLimiter, translateRouter);
    app.use('/api/v1/assistant', assistantLimiter, assistantRouter);
    app.use('/api/v1/phrases', phrasesRouter);
    // Mount WebSocket for /live captions
    setupLiveWebSocket(server);
    // Static files in production
    const clientDist = resolve(__dirname, '../../dist/client');
    if (existsSync(clientDist)) {
        app.use(express.static(clientDist, {
            setHeaders: (res, path) => {
                if (path.endsWith('.html') || path.endsWith('sw.js') || path.endsWith('manifest.webmanifest')) {
                    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
                }
                else {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                }
            }
        }));
        app.use((_req, res) => {
            res.sendFile(resolve(clientDist, 'index.html'));
        });
    }
    // Safe Centralized Error Handler
    app.use((err, _req, res, _next) => {
        console.error('Unhandled server error:', err);
        res.status(err.status || 500).json({
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
        });
    });
    return { app, server };
}
export async function start() {
    const { server } = buildApp();
    return new Promise((resolve) => {
        server.listen(PORT, HOST, () => {
            console.log(`🚀 ConnectPlus Backend running on http://${HOST}:${PORT}`);
            resolve(server);
        });
        const shutdown = async (signal) => {
            console.log(`Received ${signal}, shutting down gracefully...`);
            server.close(() => {
                process.exit(0);
            });
        };
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    start();
}
