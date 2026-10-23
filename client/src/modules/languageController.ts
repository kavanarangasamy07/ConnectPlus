import { TRANSLATIONS, SUPPORTED_LANGUAGES, LOCALIZED_BOARD_TILES, getSpeechLangCode, t } from '../translations.js';
import { showToast } from './toastController.js';

const LANG_STORAGE_KEY = 'connectplus_lang';

export type LanguageCode = 'en' | 'ta' | 'te' | 'ml' | 'kn';

export interface LanguageChangeCallback {
  (newLang: LanguageCode, speechCode: string): void;
}

export class LanguageController {
  private currentLang: LanguageCode = 'en';
  private selectEl: HTMLSelectElement | null = null;
  private listeners: LanguageChangeCallback[] = [];

  constructor() {
    this.currentLang = this.loadSavedLanguage();
  }

  public init(selectEl: HTMLSelectElement): void {
    this.selectEl = selectEl;
    this.populateDropdown();
    this.selectEl.value = this.currentLang;

    this.selectEl.addEventListener('change', () => {
      const selected = this.selectEl!.value as LanguageCode;
      this.setLanguage(selected);
    });

    // Apply translations on initial load
    this.applyTranslations(this.currentLang);
  }

  public getLanguage(): LanguageCode {
    return this.currentLang;
  }

  public getSpeechCode(): string {
    return getSpeechLangCode(this.currentLang);
  }

  public onLanguageChange(callback: LanguageChangeCallback): void {
    this.listeners.push(callback);
  }

  public setLanguage(lang: LanguageCode): void {
    if (!TRANSLATIONS[lang]) {
      lang = 'en';
    }

    this.currentLang = lang;
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    if (this.selectEl && this.selectEl.value !== lang) {
      this.selectEl.value = lang;
    }

    // Set HTML lang attribute
    document.documentElement.lang = lang;

    // Apply translations across all DOM elements instantly without reload
    this.applyTranslations(lang);

    const speechCode = getSpeechLangCode(lang);
    for (const listener of this.listeners) {
      try {
        listener(lang, speechCode);
      } catch (e) {
        console.warn('Language listener error:', e);
      }
    }

    const nativeName = SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.nativeName || lang;
    showToast(`Language switched to ${nativeName}`, 'info');
  }

  public translate(key: string): string {
    return t(this.currentLang, key);
  }

  public applyTranslations(lang: LanguageCode): void {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    // 1. Text elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && dict[key] !== undefined) {
        // If element contains child tags we don't want to blow away (like icons), update text node or replace
        const hasElementChildren = el.firstElementChild !== null;
        if (!hasElementChildren) {
          el.textContent = dict[key];
        } else {
          // If has icon span, keep icon
          const icon = el.querySelector('.i18n-icon');
          if (icon) {
            const iconHtml = icon.outerHTML;
            el.innerHTML = `${iconHtml} ${dict[key]}`;
          } else {
            el.textContent = dict[key];
          }
        }
      }
    });

    // 2. Placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && dict[key] !== undefined) {
        (el as HTMLInputElement | HTMLTextAreaElement).placeholder = dict[key];
      }
    });

    // 3. Titles with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key && dict[key] !== undefined) {
        el.setAttribute('title', dict[key]);
      }
    });

    // 4. Aria labels with data-i18n-aria-label
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (key && dict[key] !== undefined) {
        el.setAttribute('aria-label', dict[key]);
      }
    });

    // 5. Update SOS default message textarea if it hasn't been modified by user
    const sosTextArea = document.getElementById('sosText') as HTMLTextAreaElement | null;
    if (sosTextArea && (!sosTextArea.dataset.userEdited || sosTextArea.dataset.userEdited === 'false')) {
      sosTextArea.value = dict.sos_default_message || TRANSLATIONS.en.sos_default_message;
    }
  }

  private populateDropdown(): void {
    if (!this.selectEl) return;
    this.selectEl.innerHTML = SUPPORTED_LANGUAGES.map(
      (l) => `<option value="${l.code}">${l.nativeName} (${l.name})</option>`
    ).join('');
  }

  private loadSavedLanguage(): LanguageCode {
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as LanguageCode | null;
    if (saved && TRANSLATIONS[saved]) {
      return saved;
    }
    return 'en';
  }
}

export const langCtrl = new LanguageController();
