import { AudioVisualizer } from './audioVisualizer.js';
import { triggerVisualAlert } from './visualAlerts.js';

export interface SpeechControllerOptions {
  statusEl: HTMLElement | null;
  outputEl: HTMLElement | null;
  canvasEl?: HTMLCanvasElement | null;
  lang?: string;
  onResult?: (text: string, isFinal: boolean) => void;
  onStateChange?: (state: 'idle' | 'listening' | 'error') => void;
}

export class SpeechController {
  private recognition: any = null;
  private visualizer: AudioVisualizer | null = null;
  private statusEl: HTMLElement | null;
  private outputEl: HTMLElement | null;
  private lang: string;
  private onResult?: (text: string, isFinal: boolean) => void;
  private onStateChange?: (state: 'idle' | 'listening' | 'error') => void;
  
  public isListening = false;
  private shouldAutoRestart = false;
  private mediaStream: MediaStream | null = null;
  private accumulatedFinalText = '';

  constructor(options: SpeechControllerOptions) {
    this.statusEl = options.statusEl;
    this.outputEl = options.outputEl;
    this.lang = options.lang || 'en-IN';
    this.onResult = options.onResult;
    this.onStateChange = options.onStateChange;

    if (options.canvasEl) {
      this.visualizer = new AudioVisualizer(options.canvasEl);
    }
  }

  public setLanguage(newLang: string): void {
    this.lang = newLang;
    if (this.recognition) {
      this.recognition.lang = newLang;
    }
  }

  public isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  public async start(): Promise<boolean> {
    if (!this.isSupported()) {
      this.updateStatus('Speech Recognition is not supported by this browser. Please type below.', 'error');
      return false;
    }

    if (this.isListening) return true;

    this.shouldAutoRestart = true;
    this.initRecognition();

    try {
      // Attempt to access microphone for the sound wave visualizer
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && this.visualizer) {
        try {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          this.visualizer.start(this.mediaStream);
        } catch {
          // If media stream permission fails or is mocked, start visualizer in simulated wave mode
          this.visualizer.start();
        }
      } else if (this.visualizer) {
        this.visualizer.start();
      }

      this.recognition.start();
      this.isListening = true;
      this.updateStatus('Listening... Speak clearly.', 'listening');
      triggerVisualAlert('someone is speaking');
      return true;
    } catch (err: any) {
      this.updateStatus(`Microphone could not start: ${err.message || 'Error'}`, 'error');
      this.stop();
      return false;
    }
  }

  public stop(): void {
    this.shouldAutoRestart = false;
    this.isListening = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.visualizer) {
      this.visualizer.stop();
    }

    this.updateStatus('Microphone is idle.', 'idle');
  }

  public clearText(): void {
    this.accumulatedFinalText = '';
    if (this.outputEl) {
      this.outputEl.textContent = '';
    }
  }

  private initRecognition(): void {
    const SpeechRecClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecClass();
    this.recognition.lang = this.lang;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateStatus('Listening... Speak now.', 'listening');
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.accumulatedFinalText += (this.accumulatedFinalText ? ' ' : '') + transcript.trim();
          if (this.onResult) {
            this.onResult(transcript.trim(), true);
          }
        } else {
          interim += transcript;
          if (this.onResult) {
            this.onResult(interim, false);
          }
        }
      }

      const fullDisplay = (this.accumulatedFinalText + (interim ? ' ' + interim : '')).trim();
      if (this.outputEl && fullDisplay) {
        this.outputEl.textContent = fullDisplay;
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return; // Ignore temporary silence
      this.updateStatus(`Microphone notice: ${event.error}`, 'error');
    };

    this.recognition.onend = () => {
      // Auto-restart if user did not explicitly stop
      if (this.shouldAutoRestart) {
        try {
          this.recognition.start();
          return;
        } catch {}
      }
      this.isListening = false;
      this.updateStatus('Microphone is idle.', 'idle');
      if (this.visualizer) {
        this.visualizer.stop();
      }
    };
  }

  private updateStatus(msg: string, state: 'idle' | 'listening' | 'error'): void {
    if (this.statusEl) {
      this.statusEl.textContent = msg;
    }
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }
}
