import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';

// In-memory LRU cache holding up to 1000 items with a 24-hour TTL
export const translationCache = new LRUCache<string, string>({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24 // 24 hours
});

// Map to deduplicate concurrent identical in-flight translation requests
export const inFlightTranslations = new Map<string, Promise<string>>();

export function getCacheKey(source: string, target: string, text: string): string {
  return createHash('sha256')
    .update(`${source.toLowerCase()}:${target.toLowerCase()}:${text.trim().toLowerCase()}`)
    .digest('hex');
}
