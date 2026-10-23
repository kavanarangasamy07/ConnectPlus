import { unifiedAlerts } from './unifiedAlerts.js';
import { showToast } from './toastController.js';

export type ShakeSensitivity = 'low' | 'medium' | 'high';

export interface ShakeDetectorOptions {
  statusEl?: HTMLElement | null;
  onAlertTriggered?: () => void;
  getAlertMessage?: () => string;
}

const SETTINGS_KEY = 'connectplus_shake_settings';

export class ShakeDetector {
  private isEnabled = false;
  private sensitivity: ShakeSensitivity = 'medium';
  private lastX: number | null = null;
  private lastY: number | null = null;
  private lastZ: number | null = null;
  private lastShakeTime = 0;
  private readonly cooldownMs = 4000;
  private statusEl?: HTMLElement | null;
  private getAlertMessage?: () => string;
  private onAlertTriggered?: () => void;
  private boundHandler: ((event: DeviceMotionEvent) => void) | null = null;

  constructor(options?: ShakeDetectorOptions) {
    this.statusEl = options?.statusEl;
    this.getAlertMessage = options?.getAlertMessage;
    this.onAlertTriggered = options?.onAlertTriggered;
    this.loadSettings();
  }

  public init(options: ShakeDetectorOptions): void {
    this.statusEl = options.statusEl;
    this.getAlertMessage = options.getAlertMessage;
    this.onAlertTriggered = options.onAlertTriggered;
    this.updateStatus();
    if (this.isEnabled) {
      this.startListening();
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  public async setEnabled(enabled: boolean): Promise<boolean> {
    if (enabled && !this.isSupported()) {
      showToast('Device motion sensors are not supported on this browser/device.', 'danger');
      this.isEnabled = false;
      this.saveSettings();
      this.updateStatus('unsupported');
      return false;
    }

    if (enabled) {
      // Handle iOS 13+ permission if required
      if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
        try {
          const response = await (DeviceMotionEvent as any).requestPermission();
          if (response !== 'granted') {
            showToast('Permission for motion sensors was denied.', 'danger');
            this.isEnabled = false;
            this.saveSettings();
            this.updateStatus('denied');
            return false;
          }
        } catch (err: any) {
          showToast(`Motion permission request failed: ${err.message || 'Error'}`, 'danger');
          this.isEnabled = false;
          this.saveSettings();
          this.updateStatus('denied');
          return false;
        }
      }

      this.isEnabled = true;
      this.saveSettings();
      this.startListening();
      this.updateStatus('ready');
      showToast('Shake detection enabled', 'success');
      return true;
    } else {
      this.isEnabled = false;
      this.saveSettings();
      this.stopListening();
      this.updateStatus('disabled');
      showToast('Shake detection disabled', 'info');
      return true;
    }
  }

  public setSensitivity(sens: ShakeSensitivity): void {
    this.sensitivity = sens;
    this.saveSettings();
  }

  public getSensitivity(): ShakeSensitivity {
    return this.sensitivity;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public testShake(): void {
    const msg = this.getAlertMessage
      ? this.getAlertMessage()
      : '📳 SUDDEN SHAKE DETECTED! Are you okay?';

    unifiedAlerts.triggerAlert({
      type: 'shake',
      title: 'SHAKE ALERT TEST',
      message: msg,
      color: '#EC4899',
      duration: 1.2
    });

    if (this.onAlertTriggered) {
      this.onAlertTriggered();
    }

    showToast('Shake alert test triggered successfully!', 'info');
  }

  private startListening(): void {
    if (this.boundHandler) return;
    this.boundHandler = this.handleMotion.bind(this);
    window.addEventListener('devicemotion', this.boundHandler, true);
  }

  private stopListening(): void {
    if (this.boundHandler) {
      window.removeEventListener('devicemotion', this.boundHandler, true);
      this.boundHandler = null;
    }
    this.lastX = null;
    this.lastY = null;
    this.lastZ = null;
  }

  private handleMotion(event: DeviceMotionEvent): void {
    if (!this.isEnabled) return;

    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const now = Date.now();
    if (this.lastX !== null && this.lastY !== null && this.lastZ !== null) {
      const deltaX = Math.abs(acc.x - this.lastX);
      const deltaY = Math.abs(acc.y - this.lastY);
      const deltaZ = Math.abs(acc.z - this.lastZ);
      const totalDelta = deltaX + deltaY + deltaZ;

      const threshold = this.getThreshold();
      if (totalDelta > threshold && now - this.lastShakeTime > this.cooldownMs) {
        this.lastShakeTime = now;
        this.triggerDetectedAlert();
      }
    }

    this.lastX = acc.x;
    this.lastY = acc.y;
    this.lastZ = acc.z;
  }

  private getThreshold(): number {
    switch (this.sensitivity) {
      case 'low':
        return 28; // requires heavy shake
      case 'medium':
        return 19; // standard shake
      case 'high':
        return 12; // gentle movement
      default:
        return 19;
    }
  }

  private triggerDetectedAlert(): void {
    const msg = this.getAlertMessage
      ? this.getAlertMessage()
      : '📳 SUDDEN SHAKE DETECTED! Are you okay?';

    // NEVER triggers SOS automatically
    unifiedAlerts.triggerAlert({
      type: 'shake',
      title: 'SHAKE DETECTED',
      message: msg,
      color: '#EC4899',
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

  private updateStatus(state?: 'ready' | 'cooldown' | 'disabled' | 'unsupported' | 'denied'): void {
    if (!this.statusEl) return;
    const currentState = state || (this.isEnabled ? 'ready' : 'disabled');

    if (currentState === 'ready') {
      this.statusEl.textContent = '🟢 Shake sensor active. Ready for movement.';
      this.statusEl.style.color = 'var(--color-success)';
    } else if (currentState === 'cooldown') {
      this.statusEl.textContent = '🟡 Sensor in cooldown period. Paused temporarily.';
      this.statusEl.style.color = 'var(--amber)';
    } else if (currentState === 'disabled') {
      this.statusEl.textContent = '⚪ Shake detection is currently disabled.';
      this.statusEl.style.color = 'var(--text-muted)';
    } else if (currentState === 'unsupported') {
      this.statusEl.textContent = '⚠️ Device motion API not supported on this browser.';
      this.statusEl.style.color = 'var(--color-danger)';
    } else if (currentState === 'denied') {
      this.statusEl.textContent = '🔴 Device motion permission was denied.';
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
