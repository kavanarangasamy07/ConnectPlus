import { unifiedAlerts, UnifiedAlertSettings } from './unifiedAlerts.js';

export type VisualAlertSettings = UnifiedAlertSettings;

export function loadAlertSettings(): UnifiedAlertSettings {
  return unifiedAlerts.loadSettings();
}

export function saveAlertSettings(settings: Partial<UnifiedAlertSettings>): void {
  unifiedAlerts.saveSettings(settings);
}

export function triggerVisualAlert(
  eventName: 'someone is speaking' | 'SOS sent' | 'translation ready' | 'test' | 'shake' | 'noise',
  customMessage?: string
): void {
  const typeMap: Record<string, 'speech' | 'sos' | 'custom' | 'test' | 'shake' | 'noise'> = {
    'someone is speaking': 'speech',
    'SOS sent': 'sos',
    'translation ready': 'custom',
    'test': 'test',
    'shake': 'shake',
    'noise': 'noise'
  };

  const alertType = typeMap[eventName] || 'custom';
  const msg = customMessage || getEventLabel(eventName);

  unifiedAlerts.triggerAlert({
    type: alertType,
    message: msg
  });
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
