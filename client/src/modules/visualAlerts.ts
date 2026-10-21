import { showToast } from './toastController.js';

export interface VisualAlertSettings {
  color: string;
  intensity: 'soft' | 'medium' | 'vivid';
  duration: number; // in seconds
  vibration: boolean;
}

const DEFAULT_SETTINGS: VisualAlertSettings = {
  color: '#00F0FF',
  intensity: 'vivid',
  duration: 0.8,
  vibration: true
};

let currentSettings: VisualAlertSettings = { ...DEFAULT_SETTINGS };

export function loadAlertSettings(): VisualAlertSettings {
  const saved = localStorage.getItem('connectplus_alert_settings');
  if (saved) {
    try {
      currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
  }
  return currentSettings;
}

export function saveAlertSettings(settings: Partial<VisualAlertSettings>): void {
  currentSettings = { ...currentSettings, ...settings };
  localStorage.setItem('connectplus_alert_settings', JSON.stringify(currentSettings));
  applyOverlayStyle();
}

export function triggerVisualAlert(
  eventName: 'someone is speaking' | 'SOS sent' | 'translation ready' | 'test',
  customMessage?: string
): void {
  const overlay = getOrCreateOverlay();
  applyOverlayStyle();

  overlay.classList.add('flashing');

  // Haptic feedback vibration where supported
  if (currentSettings.vibration && 'vibrate' in navigator) {
    try {
      if (eventName === 'SOS sent') {
        navigator.vibrate([300, 150, 300, 150, 300]);
      } else {
        navigator.vibrate([150, 100, 150]);
      }
    } catch {}
  }

  // Display sensory toast banner
  const msg = customMessage || getEventLabel(eventName);
  showToast(msg, eventName === 'SOS sent' ? 'danger' : 'info');

  // Play subtle sensory beep tone via Web Audio API if available
  playAlertBeep(eventName === 'SOS sent' ? 880 : 440);

  setTimeout(() => {
    overlay.classList.remove('flashing');
  }, currentSettings.duration * 1000);
}

function getEventLabel(event: string): string {
  switch (event) {
    case 'someone is speaking':
      return '🔔 Speech detected: Someone is speaking now.';
    case 'SOS sent':
      return '🚨 Emergency SOS alert triggered!';
    case 'translation ready':
      return '✨ Translation complete and ready.';
    case 'test':
      return '🔔 Visual notification test successful!';
    default:
      return '🔔 Notification received.';
  }
}

function getOrCreateOverlay(): HTMLElement {
  let el = document.getElementById('visualFlashOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'visualFlashOverlay';
    el.className = 'visual-flash-overlay';
    document.body.appendChild(el);
  }
  return el;
}

function applyOverlayStyle(): void {
  const overlay = getOrCreateOverlay();
  overlay.style.setProperty('--flash-color', currentSettings.color);
  overlay.style.setProperty('--flash-duration', `${currentSettings.duration}s`);
}

function playAlertBeep(frequency = 440): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

// Initialize on script load
loadAlertSettings();
