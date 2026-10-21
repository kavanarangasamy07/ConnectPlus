import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
// In-memory LRU cache holding up to 1000 items with a 24-hour TTL
export const translationCache = new LRUCache({
    max: 1000,
    ttl: 1000 * 60 * 60 * 24 // 24 hours
});
// Map to deduplicate concurrent identical in-flight translation requests
export const inFlightTranslations = new Map();
export function getCacheKey(source, target, text) {
    return createHash('sha256')
        .update(`${source.toLowerCase()}:${target.toLowerCase()}:${text.trim().toLowerCase()}`)
        .digest('hex');
}
