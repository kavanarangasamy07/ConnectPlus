import { z } from 'zod';
import { translationCache, inFlightTranslations, getCacheKey } from '../cache.js';
import { stmts } from '../db.js';
import { getTranslationProvider } from '../adapters/translationProvider.js';
const TranslateSchema = z.object({
    text: z.string().min(1).max(500),
    source: z.string().optional().default('auto'),
    target: z.string().min(2).max(5)
});
export async function translateRoute(app) {
    app.post('/api/v1/translate', {
        config: {
            rateLimit: {
                max: 60,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const parseResult = TranslateSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Invalid input',
                details: parseResult.error.issues
            });
        }
        const { text, source, target } = parseResult.data;
        const cleanText = text.trim();
        const cacheKey = getCacheKey(source, target, cleanText);
        // 1. Check in-memory LRU cache
        const cached = translationCache.get(cacheKey);
        if (cached) {
            const response = {
                translatedText: cached,
                source,
                target,
                cached: true,
                provider: 'lru-cache'
            };
            return reply.send(response);
        }
        // 2. Check SQLite persistent database
        try {
            const dbRow = stmts.getTranslation.get(cacheKey);
            if (dbRow && dbRow.translated_text) {
                translationCache.set(cacheKey, dbRow.translated_text);
                const response = {
                    translatedText: dbRow.translated_text,
                    source,
                    target,
                    cached: true,
                    provider: 'sqlite'
                };
                return reply.send(response);
            }
        }
        catch (err) {
            request.log.warn({ err }, 'SQLite cache read error');
        }
        // 3. Deduplicate in-flight requests
        let translatePromise = inFlightTranslations.get(cacheKey);
        if (!translatePromise) {
            const provider = getTranslationProvider();
            translatePromise = provider
                .translate(cleanText, source, target)
                .then((translatedText) => {
                // Store in LRU cache
                translationCache.set(cacheKey, translatedText);
                // Store in SQLite
                try {
                    stmts.insertTranslation.run(cacheKey, source, target, cleanText, translatedText, Date.now());
                }
                catch (err) {
                    request.log.warn({ err }, 'SQLite cache write error');
                }
                return translatedText;
            })
                .finally(() => {
                inFlightTranslations.delete(cacheKey);
            });
            inFlightTranslations.set(cacheKey, translatePromise);
        }
        try {
            const translatedText = await translatePromise;
            const response = {
                translatedText,
                source,
                target,
                cached: false,
                provider: 'MyMemory'
            };
            return reply.send(response);
        }
        catch (err) {
            request.log.error({ err }, 'Translation error');
            return reply.status(502).send({
                error: 'Translation failed',
                message: err.message || 'Unable to translate text at this time'
            });
        }
    });
}
