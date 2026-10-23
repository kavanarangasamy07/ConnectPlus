import { PhraseItem } from '../../shared/types.js';
import { LOCALIZED_BOARD_TILES, getSpeechLangCode } from '../translations.js';
import { tts } from './ttsController.js';
import { showToast } from './toastController.js';

export class BoardController {
  private phrases: PhraseItem[] = [];
  private activeCategory = 'all';
  private searchQuery = '';
  private sentenceBuilder: PhraseItem[] = [];
  private deviceId: string;
  private currentLang = 'en';
  private containerEl: HTMLElement | null = null;
  private sentenceChipsEl: HTMLElement | null = null;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.loadPhrases();
  }

  public init(container: HTMLElement, sentenceChips: HTMLElement): void {
    this.containerEl = container;
    this.sentenceChipsEl = sentenceChips;
    this.render();
    this.syncWithBackend();
  }

  public setLanguage(lang: string): void {
    this.currentLang = lang;
    const localizedPresets = (LOCALIZED_BOARD_TILES as any)[lang] || LOCALIZED_BOARD_TILES.en;

    // Track existing favorites
    const favSet = new Set(this.phrases.filter((p) => p.favorite).map((p) => p.id));
    // Keep custom phrases
    const customPhrases = this.phrases.filter((p) => p.id.startsWith('cust-'));

    // Map localized presets with favorite state
    const updatedPresets: PhraseItem[] = localizedPresets.map((preset: PhraseItem) => ({
      ...preset,
      favorite: favSet.has(preset.id)
    }));

    this.phrases = [...updatedPresets, ...customPhrases];
    this.saveLocal();
    this.render();
  }

  public setCategory(cat: string): void {
    this.activeCategory = cat;
    this.render();
  }

  public setSearch(query: string): void {
    this.searchQuery = query.toLowerCase().trim();
    this.render();
  }

  public addTileToSentence(phrase: PhraseItem): void {
    this.sentenceBuilder.push(phrase);
    this.renderSentenceBuilder();
    // Speak individual tile in current language
    const speechCode = getSpeechLangCode(this.currentLang);
    tts.speak(phrase.phrase, speechCode);
  }

  public removeTileFromSentence(index: number): void {
    this.sentenceBuilder.splice(index, 1);
    this.renderSentenceBuilder();
  }

  public speakSentence(): void {
    if (this.sentenceBuilder.length === 0) {
      showToast('Sentence builder is empty. Tap some tiles first!', 'info');
      return;
    }
    const fullSentence = this.sentenceBuilder.map((p) => p.phrase).join(' ');
    const speechCode = getSpeechLangCode(this.currentLang);
    tts.speak(fullSentence, speechCode);
  }

  public clearSentence(): void {
    this.sentenceBuilder = [];
    this.renderSentenceBuilder();
  }

  public toggleFavorite(phraseId: string): void {
    const p = this.phrases.find((item) => item.id === phraseId);
    if (p) {
      p.favorite = !p.favorite;
      this.saveLocal();
      this.render();
      showToast(p.favorite ? `Favorited "${p.phrase}"` : `Removed from favorites`, 'info');
    }
  }

  public addCustomPhrase(emoji: string, phrase: string, category = 'custom'): void {
    const newItem: PhraseItem = {
      id: 'cust-' + Date.now(),
      emoji: emoji || '💬',
      phrase: phrase.trim(),
      category: category as any,
      order: this.phrases.length,
      createdAt: Date.now()
    };
    this.phrases.push(newItem);
    this.saveLocal();
    this.render();
    this.syncItemToBackend(newItem);
    showToast(`Added phrase "${newItem.phrase}"`, 'success');
  }

  public deletePhrase(phraseId: string): void {
    const index = this.phrases.findIndex((p) => p.id === phraseId);
    if (index !== -1) {
      const removed = this.phrases.splice(index, 1)[0];
      this.saveLocal();
      this.render();
      showToast(`Deleted "${removed.phrase}"`, 'info', {
        label: 'Undo',
        onClick: () => {
          this.phrases.splice(index, 0, removed);
          this.saveLocal();
          this.render();
        }
      });
      fetch(`/api/v1/phrases/${phraseId}`, {
        method: 'DELETE',
        headers: { 'x-device-id': this.deviceId }
      }).catch(() => {});
    }
  }

  private render(): void {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = '';

    const filtered = this.phrases.filter((item) => {
      const matchesCat =
        this.activeCategory === 'all' ||
        (this.activeCategory === 'favorites' && item.favorite) ||
        item.category === this.activeCategory;
      const matchesSearch =
        !this.searchQuery ||
        item.phrase.toLowerCase().includes(this.searchQuery) ||
        item.emoji.includes(this.searchQuery);
      return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
      this.containerEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <p style="font-size: 1.2rem;">No phrases found matching "${escapeHtml(this.searchQuery)}".</p>
      </div>`;
      return;
    }

    filtered.forEach((item) => {
      const tile = document.createElement('div');
      tile.className = 'tile-btn';
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', `${item.phrase}. Category: ${item.category}`);

      tile.innerHTML = `
        <button class="tile-fav-btn ${item.favorite ? 'favorited' : ''}" aria-label="Favorite phrase" title="Favorite">
          ★
        </button>
        <span class="tile-emoji">${item.emoji}</span>
        <span class="tile-text">${escapeHtml(item.phrase)}</span>
      `;

      tile.onclick = (e) => {
        if ((e.target as HTMLElement).classList.contains('tile-fav-btn')) {
          e.stopPropagation();
          this.toggleFavorite(item.id);
          return;
        }
        this.addTileToSentence(item);
      };

      tile.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.addTileToSentence(item);
        }
      };

      this.containerEl!.appendChild(tile);
    });
  }

  private renderSentenceBuilder(): void {
    if (!this.sentenceChipsEl) return;
    this.sentenceChipsEl.innerHTML = '';

    if (this.sentenceBuilder.length === 0) {
      this.sentenceChipsEl.innerHTML = `<span style="color: var(--text-muted); font-size: 0.95rem;">Tap phrase tiles above to build a sentence here...</span>`;
      return;
    }

    this.sentenceBuilder.forEach((item, idx) => {
      const chip = document.createElement('div');
      chip.className = 'sentence-chip';
      chip.innerHTML = `
        <span>${item.emoji} ${escapeHtml(item.phrase)}</span>
        <span class="sentence-chip-remove" title="Remove" aria-label="Remove ${item.phrase}">&times;</span>
      `;
      chip.querySelector('.sentence-chip-remove')!.addEventListener('click', () => {
        this.removeTileFromSentence(idx);
      });
      this.sentenceChipsEl!.appendChild(chip);
    });
  }

  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem('connectplus_device_id');
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem('connectplus_device_id', id);
    }
    return id;
  }

  private loadPhrases(): void {
    const saved = localStorage.getItem('connectplus_phrases');
    if (saved) {
      try {
        this.phrases = JSON.parse(saved);
        return;
      } catch {}
    }
    const presets = (LOCALIZED_BOARD_TILES as any)[this.currentLang] || LOCALIZED_BOARD_TILES.en;
    this.phrases = [...presets];
    this.saveLocal();
  }

  private saveLocal(): void {
    localStorage.setItem('connectplus_phrases', JSON.stringify(this.phrases));
  }

  private async syncWithBackend(): Promise<void> {
    try {
      const res = await fetch('/api/v1/phrases', {
        headers: { 'x-device-id': this.deviceId }
      });
      if (res.ok) {
        const data = (await res.json()) as { phrases: PhraseItem[] };
        if (data.phrases && data.phrases.length > 0) {
          const existingIds = new Set(this.phrases.map((p) => p.id));
          data.phrases.forEach((remote) => {
            if (!existingIds.has(remote.id)) {
              this.phrases.push(remote);
            }
          });
          this.saveLocal();
          this.render();
        }
      }
    } catch {}
  }

  private async syncItemToBackend(item: PhraseItem): Promise<void> {
    try {
      await fetch('/api/v1/phrases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId
        },
        body: JSON.stringify(item)
      });
    } catch {}
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
