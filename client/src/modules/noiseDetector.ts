import { unifiedAlerts } from './unifiedAlerts.js';
import { showToast } from './toastController.js';

export type NoiseSensitivity = 'low' | 'medium' | 'high';

export interface NoiseDetectorOptions {
  statusEl?: HTMLElement | null;
  meterBarEl?: HTMLElement | null;
  meterValueEl?: HTMLElement | null;
  getAlertMessage?: () => string;
  onAlertTriggered?: () => void;
}

const SETTINGS_KEY = 'connectplus_noise_settings';

export class NoiseDetector {
  private isEnabled = false;
  private sensitivity: NoiseSensitivity = 'medium';
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private lastAlertTime = 0;
  private readonly cooldownMs = 4000;

  private statusEl?: HTMLElement | null;
  private meterBarEl?: HTMLElement | null;
  private meterValueEl?: HTMLElement | null;
  private getAlertMessage?: () => string;
  private onAlertTriggered?: () => void;

  constructor(options?: NoiseDetectorOptions) {
    this.statusEl = options?.statusEl;
    this.meterBarEl = options?.meterBarEl;
    this.meterValueEl = options?.meterValueEl;
    this.getAlertMessage = options?.getAlertMessage;
    this.onAlertTriggered = options?.onAlertTriggered;
    this.loadSettings();
  }

  public init(options: NoiseDetectorOptions): void {
    this.statusEl = options.statusEl;
    this.meterBarEl = options.meterBarEl;
    this.meterValueEl = options.meterValueEl;
    this.getAlertMessage = options.getAlertMessage;
    this.onAlertTriggered = options.onAlertTriggered;
    this.updateStatus();
    if (this.isEnabled) {
      this.startListening();
    }
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window.AudioContext || (window as any).webkitAudioContext) &&
      !!navigator?.mediaDevices?.getUserMedia
    );
  }

  public async setEnabled(enabled: boolean): Promise<boolean> {
    if (enabled && !this.isSupported()) {
      showToast('Web Audio or Microphone access is not supported on this browser.', 'danger');
      this.isEnabled = false;
      this.saveSettings();
      this.updateStatus('unsupported');
      return false;
    }

    if (enabled) {
      const success = await this.startListening();
      if (success) {
        this.isEnabled = true;
        this.saveSettings();
        this.updateStatus('ready');
        showToast('Sudden loud-noise detection enabled (Audio processed locally)', 'success');
        return true;
      } else {
        this.isEnabled = false;
        this.saveSettings();
        return false;
      }
    } else {
      this.isEnabled = false;
      this.saveSettings();
      this.stopListening();
      this.updateStatus('disabled');
      this.resetMeter();
      showToast('Loud-noise detection disabled', 'info');
      return true;
    }
  }

  public setSensitivity(sens: NoiseSensitivity): void {
    this.sensitivity = sens;
    this.saveSettings();
  }

  public getSensitivity(): NoiseSensitivity {
    return this.sensitivity;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public testNoise(): void {
    const msg = this.getAlertMessage
      ? this.getAlertMessage()
      : '🔊 SUDDEN LOUD NOISE DETECTED! High sound level around you.';

    unifiedAlerts.triggerAlert({
      type: 'noise',
      title: 'LOUD NOISE ALERT TEST',
      message: msg,
      color: '#F59E0B',
      duration: 1.2
    });

    if (this.onAlertTriggered) {
      this.onAlertTriggered();
    }

    showToast('Loud noise alert test triggered successfully!', 'info');
  }

  private async startListening(): Promise<boolean> {
    this.stopListening();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: false
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.2;

      const source = this.audioCtx.createMediaStreamSource(this.mediaStream);
      // NOTE: We connect source ONLY to analyser, NOT to audioCtx.destination, so there is no echo/feedback
      source.connect(this.analyser);

      this.monitorAudio();
      return true;
    } catch (err: any) {
      console.warn('Microphone access denied or error:', err);
      showToast(`Microphone permission denied: ${err.message || 'Access blocked'}`, 'danger');
      this.updateStatus('denied');
      return false;
    }
  }

  private stopListening(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
  }

  private monitorAudio = (): void => {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(dataArray);

    // Compute Root Mean Square (RMS) amplitude
    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      // Normalize 0..255 to -1.0 .. +1.0
      const norm = (dataArray[i] - 128) / 128;
      sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);

    // Scale RMS for meter visualization (0 to 100%)
    const meterPercent = Math.min(100, Math.round(rms * 220));
    this.updateMeter(meterPercent);

    // Check threshold against sensitivity setting
    const threshold = this.getThreshold();
    const now = Date.now();

    if (rms > threshold && now - this.lastAlertTime > this.cooldownMs) {
      this.lastAlertTime = now;
      this.triggerDetectedAlert();
    }

    this.animFrameId = requestAnimationFrame(this.monitorAudio);
  };

  private getThreshold(): number {
    switch (this.sensitivity) {
      case 'low':
        return 0.38; // ~85 dB very loud siren/crash
      case 'medium':
        return 0.23; // ~75 dB loud shout/alarm
      case 'high':
        return 0.12; // ~65 dB moderate sudden sound
      default:
        return 0.23;
    }
  }

  private triggerDetectedAlert(): void {
    const msg = this.getAlertMessage
      ? this.getAlertMessage()
      : '🔊 SUDDEN LOUD NOISE DETECTED! High sound level around you.';

    // Unified alert trigger (NEVER triggers SOS automatically)
    unifiedAlerts.triggerAlert({
      type: 'noise',
      title: 'SUDDEN LOUD NOISE DETECTED',
      message: msg,
      color: '#F59E0B',
      duration: 1.5
    });

    this.updateStatus('cooldown');
    setTimeout(() => {
      if (this.isEnabled) {
        this.updateStatus('ready');
      }
    }, this.cooldownMs);

    if (this.onAlertTriggered) {
      this.onAlertTriggered();
    }
  }

  private updateMeter(percent: number): void {
    if (this.meterBarEl) {
      this.meterBarEl.style.width = `${percent}%`;
      if (percent > 65) {
        this.meterBarEl.style.backgroundColor = 'var(--color-danger)';
      } else if (percent > 40) {
        this.meterBarEl.style.backgroundColor = 'var(--amber)';
      } else {
        this.meterBarEl.style.backgroundColor = 'var(--teal)';
      }
    }
    if (this.meterValueEl) {
      this.meterValueEl.textContent = `${percent}%`;
    }
  }

  private resetMeter(): void {
    this.updateMeter(0);
  }

  private updateStatus(state?: 'ready' | 'cooldown' | 'disabled' | 'unsupported' | 'denied'): void {
    if (!this.statusEl) return;
    const currentState = state || (this.isEnabled ? 'ready' : 'disabled');

    if (currentState === 'ready') {
      this.statusEl.textContent = '🟢 Microphone active. Monitoring sound levels locally.';
      this.statusEl.style.color = 'var(--color-success)';
    } else if (currentState === 'cooldown') {
      this.statusEl.textContent = '🟡 Sensor in cooldown period. Paused temporarily.';
      this.statusEl.style.color = 'var(--amber)';
    } else if (currentState === 'disabled') {
      this.statusEl.textContent = '⚪ Noise detection is currently disabled.';
      this.statusEl.style.color = 'var(--text-muted)';
    } else if (currentState === 'unsupported') {
      this.statusEl.textContent = '⚠️ Web Audio or Microphone not supported on this browser.';
      this.statusEl.style.color = 'var(--color-danger)';
    } else if (currentState === 'denied') {
      this.statusEl.textContent = '🔴 Microphone permission was denied.';
      this.statusEl.style.color = 'var(--color-danger)';
    }
  }

  private loadSettings(): void {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.isEnabled = Boolean(parsed.isEnabled);
        this.sensitivity = parsed.sensitivity || 'medium';
      } catch {}
    }
  }

  private saveSettings(): void {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        isEnabled: this.isEnabled,
        sensitivity: this.sensitivity
      })
    );
  }
}
