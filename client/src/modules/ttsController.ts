export class TTSController {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private rate = 1.0;
  private pitch = 1.0;
  private isSpeaking = false;

  constructor() {
    if ('speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  public setVoice(voiceName: string): void {
    const found = this.voices.find((v) => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
    }
  }

  public setRate(newRate: number): void {
    this.rate = Math.max(0.5, Math.min(2.0, newRate));
  }

  public setPitch(newPitch: number): void {
    this.pitch = Math.max(0.5, Math.min(1.5, newPitch));
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  public speak(
    text: string,
    lang?: string,
    highlightContainer?: HTMLElement | null,
    onEnd?: () => void
  ): boolean {
    if (!this.synth) {
      alert('Text-to-Speech is not supported in this browser.');
      return false;
    }

    const cleanText = text.trim();
    if (!cleanText) return false;

    this.synth.cancel();

    // Prepare highlighted word spans if container provided
    const words = cleanText.split(/\s+/);
    if (highlightContainer) {
      highlightContainer.innerHTML = words
        .map((w, idx) => `<span class="reading-word" id="word-${idx}">${escapeHtml(w)}</span>`)
        .join(' ');
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    // Pick matching voice based on lang or target language
    const targetLang = (lang || 'en-IN').toLowerCase();
    utterance.lang = targetLang;

    if (this.selectedVoice && this.selectedVoice.lang.toLowerCase().startsWith(targetLang.slice(0, 2))) {
      utterance.voice = this.selectedVoice;
    } else {
      const matchingVoice = this.voices.find(
        (v) =>
          v.lang.toLowerCase() === targetLang ||
          v.lang.toLowerCase().startsWith(targetLang.slice(0, 2))
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
    }

    // Word boundary tracking for live reading highlight
    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word' && highlightContainer) {
        // Remove previous highlight
        highlightContainer.querySelectorAll('.active-word').forEach((el) => {
          el.classList.remove('active-word');
        });

        // Determine current word index approximately from charIndex
        const charIndex = event.charIndex;
        let cumulative = 0;
        let activeIdx = 0;
        for (let i = 0; i < words.length; i++) {
          cumulative += words[i].length + 1;
          if (charIndex < cumulative) {
            activeIdx = i;
            break;
          }
        }
        const activeWordEl = highlightContainer.querySelector(`#word-${activeIdx}`);
        if (activeWordEl) {
          activeWordEl.classList.add('active-word');
        }
      }
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (highlightContainer) {
        highlightContainer.querySelectorAll('.active-word').forEach((el) => {
          el.classList.remove('active-word');
        });
      }
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    this.isSpeaking = true;
    this.synth.speak(utterance);
    return true;
  }

  private loadVoices(): void {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (!this.selectedVoice && this.voices.length > 0) {
      // Prefer an English or Indian-English voice as default
      this.selectedVoice =
        this.voices.find((v) => v.lang.includes('en-IN')) ||
        this.voices.find((v) => v.lang.startsWith('en')) ||
        this.voices[0];
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

export const tts = new TTSController();
