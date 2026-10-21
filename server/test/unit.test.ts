import { describe, it, expect } from 'vitest';
import { getCacheKey, translationCache } from '../src/cache.js';
import { sanitizePhone, maskPhone } from '../src/routes/sos.js';
import { matchFAQ, FAQ_DATABASE } from '../src/faq.js';

describe('1. Translation Cache & Key Generation', () => {
  it('generates consistent hash regardless of casing and whitespace', () => {
    const key1 = getCacheKey('en', 'ta', 'Hello world');
    const key2 = getCacheKey('EN', 'TA', '  hello WORLD  ');
    expect(key1).toBe(key2);
  });

  it('stores and retrieves translations from LRU cache', () => {
    const key = getCacheKey('en', 'hi', 'Good morning');
    translationCache.set(key, 'शुभ प्रभात');
    expect(translationCache.get(key)).toBe('शुभ प्रभात');
  });
});

describe('2. SOS Phone Sanitizer & Formatter', () => {
  it('sanitizes international phone numbers and extracts digits', () => {
    expect(sanitizePhone('+91 98765-43210')).toBe('919876543210');
    expect(sanitizePhone('(800) 555-0199')).toBe('8005550199');
    expect(sanitizePhone('+1 (555) 234-5678')).toBe('15552345678');
  });

  it('masks phone numbers safely for privacy', () => {
    const masked = maskPhone('919876543210');
    expect(masked.startsWith('+91')).toBe(true);
    expect(masked.endsWith('3210')).toBe(true);
    expect(masked).toContain('****');
  });

  it('validates phone number digit boundaries (8 to 15 digits)', () => {
    const shortPhone = sanitizePhone('12345');
    const validPhone = sanitizePhone('+919876543210');
    const longPhone = sanitizePhone('12345678901234567');

    expect(shortPhone.length >= 8 && shortPhone.length <= 15).toBe(false);
    expect(validPhone.length >= 8 && validPhone.length <= 15).toBe(true);
    expect(longPhone.length >= 8 && longPhone.length <= 15).toBe(false);
  });
});

describe('3. FAQ Matcher & Keyword Scoring Engine', () => {
  it('matches common board queries with high confidence', () => {
    const match = matchFAQ('How do I use the communication board?');
    expect(match).not.toBeNull();
    expect(match?.item.id).toBe('board-usage');
    expect(match!.confidence).toBeGreaterThan(0.5);
    expect(match?.item.suggestions.length).toBeGreaterThan(0);
  });

  it('matches emergency SOS queries', () => {
    const match = matchFAQ('What happens when I press emergency SOS?');
    expect(match).not.toBeNull();
    expect(match?.item.id).toBe('emergency-sos');
  });

  it('matches speech-to-text and text-to-speech queries', () => {
    const match = matchFAQ('speech microphone voice visualizer');
    expect(match).not.toBeNull();
    expect(match?.item.id).toBe('speech-tools');
  });

  it('returns null or low score for completely unrelated queries', () => {
    const match = matchFAQ('xyzqwerty123 nonexistent query');
    expect(match).toBeNull();
  });
});
