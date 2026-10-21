import { tts } from './ttsController.js';
import { showToast } from './toastController.js';
import { triggerVisualAlert } from './visualAlerts.js';
import { TranslateRequest, TranslateResponse } from '../../shared/types.js';

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export class TranslationController {
  private inputEl: HTMLTextAreaElement | null = null;
  private outputEl: HTMLElement | null = null;
  private targetSelectEl: HTMLSelectElement | null = null;
  private charCountEl: HTMLElement | null = null;
  private historyListEl: HTMLElement | null = null;
  private translateBtn: HTMLButtonElement | null = null;

  private currentAbort: AbortController | null = null;
  private debounceTimer: any = null;
  private history: TranslationHistoryItem[] = [];
  private offlineQueue: Array<{ text: string; target: string }> = [];

  constructor() {
    this.loadHistory();
  }

  public init(
    input: HTMLTextAreaElement,
    output: HTMLElement,
    targetSelect: HTMLSelectElement,
    charCount: HTMLElement,
    historyList: HTMLElement,
    translateBtn: HTMLButtonElement
  ): void {
    this.inputEl = input;
    this.outputEl = output;
    this.targetSelectEl = targetSelect;
    this.charCountEl = charCount;
    this.historyListEl = historyList;
    this.translateBtn = translateBtn;

    // Character counter and debounced auto-translation
    this.inputEl.addEventListener('input', () => {
      const len = this.inputEl!.value.length;
      this.charCountEl!.textContent = `${len}/500`;

      clearTimeout(this.debounceTimer);
      if (len > 3) {
        this.debounceTimer = setTimeout(() => {
          this.translate();
        }, 600);
      }
    });

    this.targetSelectEl.addEventListener('change', () => {
      if (this.inputEl!.value.trim()) {
        this.translate();
      }
    });

    window.addEventListener('online', () => {
      this.processOfflineQueue();
    });

    this.renderHistory();
  }

  public async translate(): Promise<void> {
    if (!this.inputEl || !this.outputEl || !this.targetSelectEl) return;

    const text = this.inputEl.value.trim();
    const target = this.targetSelectEl.value;

    if (!text) {
      this.outputEl.textContent = 'Your translated message will appear here.';
      return;
    }

    if (text.length > 500) {
      showToast('Text exceeds 500 character limit.', 'danger');
      return;
    }

    // Check offline status
    if (!navigator.onLine) {
      this.outputEl.textContent = '⚡ You are offline. Request queued for when internet restores.';
      this.offlineQueue.push({ text, target });
      showToast('Translation queued until network reconnects', 'info');
      return;
    }

    if (this.currentAbort) {
      this.currentAbort.abort();
    }
    this.currentAbort = new AbortController();

    if (this.translateBtn) {
      this.translateBtn.disabled = true;
      this.translateBtn.textContent = 'Translating...';
    }
    this.outputEl.textContent = 'Translating message...';

    try {
      const payload: TranslateRequest = {
        text,
        source: 'auto',
        target
      };

      const res = await fetch('/api/v1/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: this.currentAbort.signal
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as TranslateResponse;
      this.outputEl.textContent = data.translatedText;
      triggerVisualAlert('translation ready');

      // Add to history
      this.addToHistory(text, data.translatedText, 'auto', target);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      this.outputEl.textContent = 'Translation failed. Please try again or check connection.';
      showToast(`Translation error: ${err.message}`, 'danger');
    } finally {
      if (this.translateBtn) {
        this.translateBtn.disabled = false;
        this.translateBtn.textContent = 'Translate';
      }
    }
  }

  public swapLanguages(): void {
    if (!this.inputEl || !this.outputEl || !this.targetSelectEl) return;
    const currentTranslated = this.outputEl.textContent;
    if (currentTranslated && !currentTranslated.includes('will appear here')) {
      this.inputEl.value = currentTranslated;
      this.outputEl.textContent = '';
      this.charCountEl!.textContent = `${this.inputEl.value.length}/500`;
      this.translate();
    }
  }

  public speakTranslation(): void {
    if (!this.outputEl || !this.targetSelectEl) return;
    const text = this.outputEl.textContent?.trim();
    if (!text || text.includes('will appear here')) {
      showToast('No translation text to speak yet.', 'info');
      return;
    }
    const targetLang = this.targetSelectEl.value;
    tts.speak(text, targetLang);
  }

  public copyTranslation(): void {
    if (!this.outputEl) return;
    const text = this.outputEl.textContent?.trim();
    if (!text || text.includes('will appear here')) {
      showToast('No translation to copy.', 'info');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      showToast('Translation copied to clipboard!', 'success');
    });
  }

  private addToHistory(sourceText: string, translatedText: string, sourceLang: string, targetLang: string): void {
    const item: TranslationHistoryItem = {
      id: 'th-' + Date.now(),
      sourceText,
      translatedText,
      sourceLang,
      targetLang,
      timestamp: Date.now()
    };
    // Keep last 10
    this.history.unshift(item);
    if (this.history.length > 10) {
      this.history.pop();
    }
    this.saveHistory();
    this.renderHistory();
  }

  private renderHistory(): void {
    if (!this.historyListEl) return;
    this.historyListEl.innerHTML = '';

    if (this.history.length === 0) {
      this.historyListEl.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">No recent translations yet.</span>`;
      return;
    }

    this.history.forEach((h) => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.innerHTML = `
        <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px;">
          <strong>${escapeHtml(h.sourceText)}</strong> &rarr; <span style="color: var(--teal);">${escapeHtml(h.translatedText)}</span>
        </div>
        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; min-height: 28px;" title="Use translation">
          Use
        </button>
      `;
      row.querySelector('button')!.onclick = () => {
        if (this.inputEl && this.outputEl && this.targetSelectEl) {
          this.inputEl.value = h.sourceText;
          this.outputEl.textContent = h.translatedText;
          this.targetSelectEl.value = h.targetLang;
          this.charCountEl!.textContent = `${h.sourceText.length}/500`;
        }
      };
      this.historyListEl!.appendChild(row);
    });
  }

  private loadHistory(): void {
    const raw = localStorage.getItem('connectplus_trans_history');
    if (raw) {
      try {
        this.history = JSON.parse(raw);
      } catch {}
    }
  }

  private saveHistory(): void {
    localStorage.setItem('connectplus_trans_history', JSON.stringify(this.history));
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length > 0) {
      showToast('Network restored! Processing queued translations...', 'success');
      const item = this.offlineQueue.shift();
      if (item && this.inputEl && this.targetSelectEl) {
        this.inputEl.value = item.text;
        this.targetSelectEl.value = item.target;
        this.translate();
      }
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
