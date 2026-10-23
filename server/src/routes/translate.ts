import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { translationCache, inFlightTranslations, getCacheKey } from '../cache.js';
import { stmts } from '../db.js';
import { getTranslationProvider } from '../adapters/translationProvider.js';
import { TranslateResponse } from '../types.js';

export const translateRouter = Router();

const TranslateSchema = z.object({
  text: z.string().min(1).max(500),
  source: z.string().optional().default('auto'),
  target: z.string().min(2).max(5)
});

translateRouter.post('/', async (req: Request, res: Response) => {
  const parseResult = TranslateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
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
    const response: TranslateResponse = {
      translatedText: cached,
      source,
      target,
      cached: true,
      provider: 'lru-cache'
    };
    return res.json(response);
  }

  // 2. Check SQLite persistent database
  try {
    const dbRow = stmts.getTranslation.get(cacheKey) as { translated_text: string } | undefined;
    if (dbRow && dbRow.translated_text) {
      translationCache.set(cacheKey, dbRow.translated_text);
      const response: TranslateResponse = {
        translatedText: dbRow.translated_text,
        source,
        target,
        cached: true,
        provider: 'sqlite'
      };
      return res.json(response);
    }
  } catch (err) {
    console.warn('SQLite cache read error:', err);
  }

  // 3. Deduplicate in-flight requests
  let translatePromise = inFlightTranslations.get(cacheKey);
  if (!translatePromise) {
    const provider = getTranslationProvider();
    translatePromise = provider
      .translate(cleanText, source, target)
      .then((translatedText) => {
        translationCache.set(cacheKey, translatedText);
        try {
          stmts.insertTranslation.run(
            cacheKey,
            source,
            target,
            cleanText,
            translatedText,
            Date.now()
          );
        } catch (err) {
          console.warn('SQLite cache write error:', err);
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
    const response: TranslateResponse = {
      translatedText,
      source,
      target,
      cached: false,
      provider: 'MyMemory'
    };
    return res.json(response);
  } catch (err: any) {
    console.error('Translation error:', err);
    return res.status(502).json({
      error: 'Translation failed',
      message: err.message || 'Unable to translate text at this time'
    });
  }
});
