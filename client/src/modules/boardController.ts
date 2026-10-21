import { PhraseItem } from '../../shared/types.js';
import { tts } from './ttsController.js';
import { showToast } from './toastController.js';

const DEFAULT_PHRASES: PhraseItem[] = [
  // Basic
  { id: 'b1', emoji: '👋', phrase: 'Hello!', category: 'basic', order: 0 },
  { id: 'b2', emoji: '🙏', phrase: 'Thank you.', category: 'basic', order: 1 },
  { id: 'b3', emoji: '✅', phrase: 'Yes.', category: 'basic', order: 2 },
  { id: 'b4', emoji: '❌', phrase: 'No.', category: 'basic', order: 3 },
  { id: 'b5', emoji: '❓', phrase: 'I do not understand.', category: 'basic', order: 4 },
  { id: 'b6', emoji: '🗣️', phrase: 'Please speak slowly.', category: 'basic', order: 5 },
  // Health
  { id: 'h1', emoji: '🩺', phrase: 'I need a doctor.', category: 'health', order: 0 },
  { id: 'h2', emoji: '🤒', phrase: 'I am feeling sick.', category: 'health', order: 1 },
  { id: 'h3', emoji: '💊', phrase: 'I need my medicine.', category: 'health', order: 2 },
  { id: 'h4', emoji: '🩹', phrase: 'I am in pain.', category: 'health', order: 3 },
  // Food and Water
  { id: 'f1', emoji: '💧', phrase: 'I need water.', category: 'food', order: 0 },
  { id: 'f2', emoji: '🍎', phrase: 'I need food.', category: 'food', order: 1 },
  { id: 'f3', emoji: '☕', phrase: 'I would like tea or coffee.', category: 'food', order: 2 },
  { id: 'f4', emoji: '🚻', phrase: 'I need to go to the washroom.', category: 'food', order: 3 },
  // Emotions
  { id: 'e1', emoji: '😊', phrase: 'I am happy.', category: 'emotions', order: 0 },
  { id: 'e2', emoji: '😔', phrase: 'I am sad.', category: 'emotions', order: 1 },
  { id: 'e3', emoji: '😟', phrase: 'I feel anxious.', category: 'emotions', order: 2 },
  { id: 'e4', emoji: '😴', phrase: 'I am tired.', category: 'emotions', order: 3 },
  // Emergency
  { id: 'em1', emoji: '🆘', phrase: 'Please help me immediately!', category: 'emergency', order: 0 },
  { id: 'em2', emoji: '📞', phrase: 'Please call my emergency contact.', category: 'emergency', order: 1 },
  { id: 'em3', emoji: '🚨', phrase: 'There is an emergency here.', category: 'emergency', order: 2 }
];

export class BoardController {
  private phrases: PhraseItem[] = [];
  private activeCategory: string = 'all';
  private searchQuery: string = '';
  private sentenceBuilder: PhraseItem[] = [];
  private deviceId: string;
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
    // Also speak individual tile upon selection
    tts.speak(phrase.phrase);
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
    tts.speak(fullSentence);
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

      // Tap on tile
      tile.onclick = (e) => {
        if ((e.target as HTMLElement).classList.contains('tile-fav-btn')) {
          e.stopPropagation();
          this.toggleFavorite(item.id);
          return;
        }
        this.addTileToSentence(item);
      };

      // Keyboard accessible Enter / Space
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
      this.sentenceChipsEl.innerHTML = `<span style="color: var(--text-muted); font-size: 0.95rem;">Tap tiles to build a complete sentence here...</span>`;
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
    this.phrases = [...DEFAULT_PHRASES];
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
          // Merge unique phrases
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
