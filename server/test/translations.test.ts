import { describe, it, expect } from 'vitest';
import { TRANSLATIONS, SUPPORTED_LANGUAGES, LOCALIZED_BOARD_TILES, getSpeechLangCode, t } from '../../client/src/translations.js';

describe('1. Multilingual Translation Key Parity & Accuracy Tests', () => {
  it('supports exactly the 5 required languages', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(['en', 'ta', 'te', 'ml', 'kn']);
  });

  it('maps correct Indian speech language codes (en-IN, ta-IN, te-IN, ml-IN, kn-IN)', () => {
    expect(getSpeechLangCode('en')).toBe('en-IN');
    expect(getSpeechLangCode('ta')).toBe('ta-IN');
    expect(getSpeechLangCode('te')).toBe('te-IN');
    expect(getSpeechLangCode('ml')).toBe('ml-IN');
    expect(getSpeechLangCode('kn')).toBe('kn-IN');
  });

  it('enforces 100% key parity across all 5 languages without any missing keys', () => {
    const enKeys = Object.keys(TRANSLATIONS.en).sort();
    expect(enKeys.length).toBeGreaterThan(60);

    const languages: Array<'ta' | 'te' | 'ml' | 'kn'> = ['ta', 'te', 'ml', 'kn'];
    for (const lang of languages) {
      const langKeys = Object.keys(TRANSLATIONS[lang]).sort();
      const missingKeys = enKeys.filter((k) => !(k in TRANSLATIONS[lang]));
      const extraKeys = langKeys.filter((k) => !(k in TRANSLATIONS.en));

      expect(missingKeys, `Language ${lang} is missing keys: ${missingKeys.join(', ')}`).toEqual([]);
      expect(extraKeys, `Language ${lang} has unexpected keys: ${extraKeys.join(', ')}`).toEqual([]);
      expect(langKeys.length).toBe(enKeys.length);
    }
  });

  it('ensures no empty or placeholder translation strings exist', () => {
    for (const [lang, dict] of Object.entries(TRANSLATIONS)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value, `Lang ${lang} key ${key} is not a string`).toBe('string');
        expect(value.trim().length, `Lang ${lang} key ${key} is empty`).toBeGreaterThan(0);
        expect(value, `Lang ${lang} key ${key} contains placeholder text`).not.toContain('TODO');
        expect(value, `Lang ${lang} key ${key} contains placeholder text`).not.toContain('Lorem ipsum');
      }
    }
  });

  it('provides natural, non-empty emergency SOS default messages in all 5 languages', () => {
    expect(TRANSLATIONS.en.sos_default_message).toContain('EMERGENCY:');
    expect(TRANSLATIONS.ta.sos_default_message).toContain('அவசரம்:');
    expect(TRANSLATIONS.te.sos_default_message).toContain('అత్యవసరం:');
    expect(TRANSLATIONS.ml.sos_default_message).toContain('അടിയന്തിരം:');
    expect(TRANSLATIONS.kn.sos_default_message).toContain('ತುರ್ತು ಪರಿಸ್ಥಿತಿ:');
  });

  it('provides complete localized communication board tiles for all 5 languages', () => {
    const langs = ['en', 'ta', 'te', 'ml', 'kn'];
    for (const lang of langs) {
      const tiles = (LOCALIZED_BOARD_TILES as any)[lang];
      expect(Array.isArray(tiles)).toBe(true);
      expect(tiles.length).toBeGreaterThanOrEqual(20);

      tiles.forEach((tile: any) => {
        expect(tile.id).toBeTruthy();
        expect(tile.emoji).toBeTruthy();
        expect(tile.phrase.trim().length).toBeGreaterThan(0);
        expect(['basic', 'health', 'food', 'emotions', 'emergency']).toContain(tile.category);
      });
    }
  });

  it('translates keys with fallback to English if unknown key requested', () => {
    expect(t('en', 'nav_overview')).toBe('Overview');
    expect(t('ta', 'nav_overview')).toBe('மேலோட்டம்');
    expect(t('te', 'nav_overview')).toBe('అవలోకనం');
    expect(t('ml', 'nav_overview')).toBe('അവലോകനം');
    expect(t('kn', 'nav_overview')).toBe('ಅವಲೋಕನ');
    expect(t('ta', 'nonexistent_key_xyz')).toBe('nonexistent_key_xyz');
  });
});
