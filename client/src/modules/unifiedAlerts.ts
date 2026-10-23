import { showToast } from './toastController.js';

export interface UnifiedAlertConfig {
  type: 'shake' | 'noise' | 'speech' | 'sos' | 'test' | 'custom';
  title?: string;
  message: string;
  color?: string;
  duration?: number; // seconds
}

export interface UnifiedAlertSettings {
  flashColor: string;
  flashDuration: number; // in seconds
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_SETTINGS: UnifiedAlertSettings = {
  flashColor: '#00F0FF',
  flashDuration: 1.0,
  soundEnabled: true,
  vibrationEnabled: true
};

const SETTINGS_KEY = 'connectplus_unified_alert_settings';

export class UnifiedAlertSystem {
  private settings: UnifiedAlertSettings = { ...DEFAULT_SETTINGS };
  private lastAlertTimestamp = 0;
  private readonly cooldownMs = 3500;
  private overlayEl: HTMLElement | null = null;
  private bannerEl: HTMLElement | null = null;
  private dismissTimer: any = null;

  constructor() {
    this.loadSettings();
  }

  public loadSettings(): UnifiedAlertSettings {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      } catch {}
    }
    return this.settings;
  }

  public saveSettings(updates: Partial<UnifiedAlertSettings>): void {
    this.settings = { ...this.settings, ...updates };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    this.applyStyles();
  }

  public getSettings(): UnifiedAlertSettings {
    return { ...this.settings };
  }

  public triggerAlert(config: UnifiedAlertConfig): boolean {
    const now = Date.now();
    // Enforce cooldown to prevent repeated alerts
    if (now - this.lastAlertTimestamp < this.cooldownMs && config.type !== 'test') {
      return false;
    }
    this.lastAlertTimestamp = now;

    const overlay = this.getOrCreateOverlay();
    const banner = this.getOrCreateBanner();

    const color = config.color || (config.type === 'sos' ? '#EF4444' : this.settings.flashColor);
    const duration = config.duration || this.settings.flashDuration;

    // 1. Visual Flashing Perimeter
    overlay.style.setProperty('--flash-color', color);
    overlay.style.setProperty('--flash-duration', `${duration}s`);
    overlay.classList.remove('flashing');
    void overlay.offsetWidth; // Force reflow
    overlay.classList.add('flashing');

    // 2. Large Warning Text Banner
    const icon =
      config.type === 'shake'
        ? '📳'
        : config.type === 'noise'
        ? '🔊'
        : config.type === 'sos'
        ? '🚨'
        : '🔔';

    const titleText = config.title || this.getDefaultTitle(config.type);

    banner.innerHTML = `
      <div class="unified-alert-card" style="border-left-color: ${color};">
        <div class="unified-alert-icon">${icon}</div>
        <div class="unified-alert-content">
          <div class="unified-alert-title">${escapeHtml(titleText)}</div>
          <div class="unified-alert-message">${escapeHtml(config.message)}</div>
        </div>
        <button class="unified-alert-dismiss" aria-label="Dismiss alert" id="dismissAlertBtn">&times;</button>
      </div>
    `;
    banner.classList.add('active');

    const dismissBtn = banner.querySelector('#dismissAlertBtn');
    dismissBtn?.addEventListener('click', () => this.hideBanner());

    clearTimeout(this.dismissTimer);
    this.dismissTimer = setTimeout(() => {
      this.hideBanner();
      overlay.classList.remove('flashing');
    }, Math.max(duration * 1000, 3200));

    // 3. Audio Chime (if soundEnabled)
    if (this.settings.soundEnabled) {
      this.playChime(config.type);
    }

    // 4. Haptic Feedback Vibration (if vibrationEnabled)
    if (this.settings.vibrationEnabled && 'vibrate' in navigator) {
      try {
        if (config.type === 'sos') {
          navigator.vibrate([300, 150, 300, 150, 300]);
        } else if (config.type === 'shake') {
          navigator.vibrate([200, 100, 200]);
        } else if (config.type === 'noise') {
          navigator.vibrate([250, 100, 250]);
        } else {
          navigator.vibrate([150, 80, 150]);
        }
      } catch {}
    }

    return true;
  }

  private hideBanner(): void {
    if (this.bannerEl) {
      this.bannerEl.classList.remove('active');
    }
  }

  private getDefaultTitle(type: string): string {
    switch (type) {
      case 'shake':
        return 'SHAKE DETECTED';
      case 'noise':
        return 'SUDDEN LOUD NOISE DETECTED';
      case 'sos':
        return 'EMERGENCY SOS';
      case 'speech':
        return 'SPEECH DETECTED';
      default:
        return 'ACCESSIBILITY ALERT';
    }
  }

  private playChime(type: string): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq =
        type === 'sos' ? 880 : type === 'shake' ? 520 : type === 'noise' ? 440 : 660;

      osc.type = type === 'sos' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  private getOrCreateOverlay(): HTMLElement {
    if (!this.overlayEl) {
      let el = document.getElementById('visualFlashOverlay');
      if (!el) {
        el = document.createElement('div');
        el.id = 'visualFlashOverlay';
        el.className = 'visual-flash-overlay';
        document.body.appendChild(el);
      }
      this.overlayEl = el;
    }
    return this.overlayEl;
  }

  private getOrCreateBanner(): HTMLElement {
    if (!this.bannerEl) {
      let el = document.getElementById('unifiedAlertBanner');
      if (!el) {
        el = document.createElement('div');
        el.id = 'unifiedAlertBanner';
        el.className = 'unified-alert-banner';
        el.setAttribute('role', 'alert');
        el.setAttribute('aria-live', 'assertive');
        document.body.appendChild(el);
      }
      this.bannerEl = el;
    }
    return this.bannerEl;
  }

  private applyStyles(): void {
    const overlay = this.getOrCreateOverlay();
    overlay.style.setProperty('--flash-color', this.settings.flashColor);
    overlay.style.setProperty('--flash-duration', `${this.settings.flashDuration}s`);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const unifiedAlerts = new UnifiedAlertSystem();
