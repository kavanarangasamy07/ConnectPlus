import { SOSContact, SOSRequest, SOSResponse } from '../../shared/types.js';
import { ContactStorage } from './contactStorage.js';
import { showToast } from './toastController.js';
import { unifiedAlerts } from './unifiedAlerts.js';

export interface SOSControllerElements {
  userNameInput: HTMLInputElement | null;
  phoneInput: HTMLInputElement | null;
  messageInput: HTMLTextAreaElement | null;
  locationConsentCheck: HTMLInputElement | null;
  contactsListEl: HTMLElement | null;
  statusEl: HTMLElement | null;
  confirmModal: HTMLElement | null;
  countdownModal: HTMLElement | null;
  countdownCircle: HTMLElement | null;
}

export class SOSController {
  private contacts: SOSContact[] = [];
  private countdownTimer: any = null;
  private countdownValue = 3;
  private userLocation: { lat: number; lng: number } | null = null;
  private isLocationConsentGranted = false;
  private isSending = false;
  private lastDispatchedPayload: SOSRequest | null = null;

  private elements: SOSControllerElements = {
    userNameInput: null,
    phoneInput: null,
    messageInput: null,
    locationConsentCheck: null,
    contactsListEl: null,
    statusEl: null,
    confirmModal: null,
    countdownModal: null,
    countdownCircle: null
  };

  constructor() {
    this.contacts = ContactStorage.loadContacts();
  }

  public init(elements: SOSControllerElements): void {
    this.elements = elements;

    // Load saved user name if available
    const savedName = localStorage.getItem('connectplus_user_name');
    if (savedName && this.elements.userNameInput) {
      this.elements.userNameInput.value = savedName;
    }

    this.elements.userNameInput?.addEventListener('input', () => {
      localStorage.setItem('connectplus_user_name', this.elements.userNameInput!.value.trim());
    });

    // Populate phone input with primary contact if empty
    const primary = this.getPrimaryContact();
    if (primary && this.elements.phoneInput && !this.elements.phoneInput.value) {
      this.elements.phoneInput.value = primary.phone;
    }

    this.renderContacts();
  }

  public getContacts(): SOSContact[] {
    return [...this.contacts];
  }

  public getPrimaryContact(): SOSContact | null {
    if (this.contacts.length === 0) return null;
    return this.contacts.find((c) => c.isPrimary) || this.contacts[0];
  }

  public setLocationConsent(consent: boolean): void {
    this.isLocationConsentGranted = consent;
    if (consent) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.userLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            };
            showToast('GPS coordinates acquired for emergency message', 'success');
          },
          (err) => {
            this.userLocation = null;
            showToast(`GPS location not granted (${err.message}). SOS will be sent without coordinates.`, 'info');
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      } else {
        showToast('Geolocation is not supported by this browser.', 'info');
      }
    } else {
      this.userLocation = null;
    }
  }

  public addContact(name: string, phone: string, isPrimary = false): boolean {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      showToast('Phone number must have 8 to 15 digits including country code.', 'danger');
      return false;
    }

    if (this.contacts.length >= 5) {
      showToast('Maximum of 5 emergency contacts reached.', 'info');
      return false;
    }

    // If marked primary or first contact, unset other primaries
    if (isPrimary || this.contacts.length === 0) {
      this.contacts.forEach((c) => (c.isPrimary = false));
      isPrimary = true;
    }

    const contact: SOSContact = {
      id: 'cnt-' + Date.now(),
      name: name.trim() || 'Emergency Contact',
      phone: phone.trim(),
      isPrimary
    };

    this.contacts.push(contact);
    ContactStorage.saveContacts(this.contacts);
    this.renderContacts();

    if (isPrimary && this.elements.phoneInput) {
      this.elements.phoneInput.value = contact.phone;
    }

    showToast(`Added contact ${contact.name}`, 'success');
    return true;
  }

  public setPrimaryContact(id: string): void {
    this.contacts.forEach((c) => {
      c.isPrimary = c.id === id;
    });
    ContactStorage.saveContacts(this.contacts);
    this.renderContacts();

    const primary = this.getPrimaryContact();
    if (primary && this.elements.phoneInput) {
      this.elements.phoneInput.value = primary.phone;
      showToast(`Primary contact set to: ${primary.name}`, 'info');
    }
  }

  public removeContact(id: string): void {
    const wasPrimary = this.contacts.find((c) => c.id === id)?.isPrimary;
    this.contacts = this.contacts.filter((c) => c.id !== id);

    if (wasPrimary && this.contacts.length > 0) {
      this.contacts[0].isPrimary = true;
    }

    ContactStorage.saveContacts(this.contacts);
    this.renderContacts();

    const primary = this.getPrimaryContact();
    if (this.elements.phoneInput) {
      this.elements.phoneInput.value = primary ? primary.phone : '';
    }

    showToast('Contact removed', 'info');
  }

  /**
   * Opens the confirmation dialog before sending SOS
   */
  public openConfirmationDialog(): void {
    const phone = this.elements.phoneInput?.value.trim() || '';
    const message = this.elements.messageInput?.value.trim() || '';

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      showToast('Please enter a valid emergency phone number (8-15 digits with country code).', 'danger');
      return;
    }

    if (!message) {
      showToast('Please enter an emergency message.', 'danger');
      return;
    }

    const modal = this.elements.confirmModal;
    if (!modal) {
      // Fallback: start countdown directly if no modal element
      this.startCountdown();
      return;
    }

    // Populate modal preview details
    const recipientEl = modal.querySelector('#sosConfirmRecipient');
    const locationEl = modal.querySelector('#sosConfirmLocation');
    const messageEl = modal.querySelector('#sosConfirmMessage');
    const senderEl = modal.querySelector('#sosConfirmSender');

    const primary = this.getPrimaryContact();
    const displayName = primary && primary.phone.replace(/\D/g, '') === digits ? primary.name : 'Recipient';

    if (recipientEl) {
      recipientEl.textContent = `${displayName} (${maskDigits(digits)})`;
    }

    if (senderEl) {
      const name = this.elements.userNameInput?.value.trim() || 'Not specified';
      senderEl.textContent = name;
    }

    if (locationEl) {
      locationEl.textContent =
        this.isLocationConsentGranted && this.userLocation
          ? `📍 GPS coordinates included (${this.userLocation.lat.toFixed(4)}, ${this.userLocation.lng.toFixed(4)})`
          : '📍 Location omitted (consent not enabled or not acquired)';
    }

    if (messageEl) {
      messageEl.textContent = message;
    }

    modal.classList.add('active');
  }

  public closeConfirmationDialog(): void {
    if (this.elements.confirmModal) {
      this.elements.confirmModal.classList.remove('active');
    }
  }

  public confirmAndStartCountdown(): void {
    this.closeConfirmationDialog();
    this.startCountdown();
  }

  public cancelCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.elements.countdownModal) {
      this.elements.countdownModal.classList.remove('active');
    }
    this.isSending = false;
    showToast('Emergency SOS cancelled.', 'info');
  }

  private startCountdown(): void {
    if (this.isSending) return;

    this.countdownValue = 3;
    if (this.elements.countdownModal && this.elements.countdownCircle) {
      this.elements.countdownModal.classList.add('active');
      this.elements.countdownCircle.textContent = this.countdownValue.toString();
    }

    this.playTone(700);

    this.countdownTimer = setInterval(() => {
      this.countdownValue--;
      if (this.elements.countdownCircle) {
        this.elements.countdownCircle.textContent = this.countdownValue.toString();
      }

      if (this.countdownValue > 0) {
        this.playTone(700);
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        if (this.elements.countdownModal) {
          this.elements.countdownModal.classList.remove('active');
        }
        this.dispatchSOS();
      }
    }, 1000);
  }

  public async retryLastSOS(): Promise<void> {
    if (this.lastDispatchedPayload) {
      await this.sendSOSPayload(this.lastDispatchedPayload);
    } else {
      this.dispatchSOS();
    }
  }

  private async dispatchSOS(): Promise<void> {
    const phone = this.elements.phoneInput!.value.trim();
    const message = this.elements.messageInput!.value.trim();
    const userName = this.elements.userNameInput?.value.trim() || undefined;

    const payload: SOSRequest = {
      phone,
      message,
      userName,
      lat: this.isLocationConsentGranted && this.userLocation ? this.userLocation.lat : undefined,
      lng: this.isLocationConsentGranted && this.userLocation ? this.userLocation.lng : undefined
    };

    await this.sendSOSPayload(payload);
  }

  private async sendSOSPayload(payload: SOSRequest): Promise<void> {
    if (this.isSending) {
      showToast('An emergency dispatch is already processing...', 'info');
      return;
    }

    this.isSending = true;
    this.lastDispatchedPayload = payload;

    // Trigger visual sensory alert
    unifiedAlerts.triggerAlert({
      type: 'sos',
      title: 'EMERGENCY SOS DISPATCH',
      message: '🚨 Emergency SOS dispatch in progress...',
      color: '#EF4444',
      duration: 2.0
    });

    if (this.elements.statusEl) {
      this.elements.statusEl.innerHTML = `
        <div style="padding: 16px; background: var(--bg-surface-subtle); border-radius: 12px; margin-top: 16px; text-align: center;">
          <div class="spinner" style="display: inline-block; width: 24px; height: 24px; border: 3px solid var(--teal); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 8px; font-weight: 600;">Contacting emergency service / SMS gateway...</p>
        </div>
      `;
    }

    try {
      const res = await fetch('/api/v1/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.status === 409) {
        showToast('Duplicate SOS request prevented. Please wait a moment.', 'info');
        this.renderStatusCard(null, payload, 'Duplicate dispatch prevented. Cooldown active.');
        return;
      }

      if (res.status === 429) {
        showToast('Rate limit exceeded for SOS dispatch. Please wait 1 minute.', 'danger');
        this.renderStatusCard(null, payload, 'Rate limit exceeded. Please try manual SMS link.');
        return;
      }

      const data = (await res.json()) as SOSResponse;
      this.renderStatusCard(data, payload);
    } catch (err: any) {
      // Local fallback if server unreachable
      console.warn('Backend SOS request failed:', err);
      this.renderStatusCard(null, payload, 'Backend service unreachable. Use manual SMS link below.');
    } finally {
      this.isSending = false;
    }
  }

  private renderStatusCard(data: SOSResponse | null, payload: SOSRequest, customNotice?: string): void {
    if (!this.elements.statusEl) return;

    const cleanDigits = payload.phone.replace(/\D/g, '');
    let finalMsg = '';
    if (payload.userName) {
      finalMsg += `[From: ${payload.userName}]\n`;
    }
    finalMsg += payload.message;
    if (payload.lat !== undefined && payload.lng !== undefined) {
      finalMsg += `\n📍 Current Location: https://maps.google.com/?q=${payload.lat.toFixed(6)},${payload.lng.toFixed(6)}`;
    }

    const encodedMsg = encodeURIComponent(finalMsg);
    const smsUrl = data?.smsUrl || `sms:${cleanDigits}?body=${encodedMsg}`;
    const waUrl = data?.waUrl || `https://wa.me/${cleanDigits}?text=${encodedMsg}`;

    if (data && data.smsSent) {
      // Real verified delivery via gateway
      this.elements.statusEl.innerHTML = `
        <div class="sos-result-card success" style="background: rgba(16, 185, 129, 0.12); border: 2px solid var(--color-success); padding: 20px; border-radius: 16px; margin-top: 16px;">
          <h3 style="color: var(--color-success); margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
            ✅ Emergency SMS Dispatched!
          </h3>
          <p style="margin: 6px 0;">An automated SMS has been accepted and sent by the SMS gateway provider (<strong>${escapeHtml(data.provider || 'Gateway')}</strong>).</p>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin: 8px 0;">
            Recipient: <strong>${data.phoneMasked}</strong> | Message ID: <code>${escapeHtml(data.messageId || 'sent')}</code>
          </div>
          <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="${smsUrl}" class="btn" style="text-decoration: none; padding: 8px 16px; font-size: 0.9rem;">
              📱 Open in Native SMS
            </a>
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="text-decoration: none; padding: 8px 16px; font-size: 0.9rem;">
              💬 Open in WhatsApp
            </a>
            <button class="btn-secondary" id="copySosMsgBtn" style="padding: 8px 16px; font-size: 0.9rem;">
              📋 Copy Message
            </button>
          </div>
        </div>
      `;
    } else {
      // Unconfigured gateway or network failure: NEVER fake success
      const notice =
        customNotice ||
        '⚠️ Automated SMS gateway is not configured on the server. No automated SMS was dispatched.';

      this.elements.statusEl.innerHTML = `
        <div class="sos-result-card notice" style="background: rgba(245, 158, 11, 0.12); border: 2px solid var(--amber); padding: 20px; border-radius: 16px; margin-top: 16px;">
          <h3 style="color: var(--amber); margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
            ⚠️ Direct SMS Action Required
          </h3>
          <p style="margin: 6px 0; font-weight: 500;">${escapeHtml(notice)}</p>
          <p style="margin: 8px 0; font-size: 0.9rem;">
            Please tap the button below to send this emergency message directly from your device's native SMS application:
          </p>

          <div style="margin: 14px 0; display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="${smsUrl}" class="btn" style="text-decoration: none; padding: 12px 20px; font-size: 1rem; font-weight: 700; background: linear-gradient(135deg, var(--color-danger), #D97706);">
              📱 Send via Native SMS Now
            </a>
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="text-decoration: none; padding: 12px 18px; font-size: 0.95rem;">
              💬 Send via WhatsApp
            </a>
            <button class="btn-secondary" id="copySosMsgBtn" style="padding: 12px 16px; font-size: 0.95rem;">
              📋 Copy Message
            </button>
            <button class="btn-secondary" id="retrySosBtn" style="padding: 12px 16px; font-size: 0.95rem;">
              🔄 Retry Dispatch
            </button>
          </div>

          <div style="background: var(--bg-surface); padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; color: var(--text-muted); border: 1px dashed var(--border-subtle); margin-top: 10px;">
            <strong>Prepared Message Preview:</strong><br>
            <span style="white-space: pre-wrap;">${escapeHtml(finalMsg)}</span>
          </div>
        </div>
      `;
    }

    document.getElementById('copySosMsgBtn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(finalMsg).then(() => {
        showToast('Emergency message copied to clipboard!', 'success');
      });
    });

    document.getElementById('retrySosBtn')?.addEventListener('click', () => {
      this.retryLastSOS();
    });
  }

  private renderContacts(): void {
    if (!this.elements.contactsListEl) return;
    this.elements.contactsListEl.innerHTML = '';

    if (this.contacts.length === 0) {
      this.elements.contactsListEl.innerHTML = `
        <span style="color: var(--text-muted); font-size: 0.85rem;">
          No contacts saved yet. Add trusted emergency contacts for one-tap dispatch.
        </span>
      `;
      return;
    }

    this.contacts.forEach((c) => {
      const chip = document.createElement('div');
      chip.className = `contact-chip ${c.isPrimary ? 'primary-chip' : ''}`;
      chip.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: ${c.isPrimary ? 'rgba(30, 111, 217, 0.15)' : 'var(--bg-surface-subtle)'};
        border: 1px solid ${c.isPrimary ? 'var(--primary-blue)' : 'var(--border-subtle)'};
        padding: 6px 12px;
        border-radius: 999px;
        margin-right: 8px;
        margin-bottom: 8px;
        font-size: 0.85rem;
      `;

      const primaryTag = c.isPrimary
        ? `<span style="background: var(--primary-blue); color: white; padding: 2px 6px; border-radius: 999px; font-size: 0.75rem; font-weight: 700;">⭐ Primary</span>`
        : `<button class="make-primary-btn" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; font-size: 0.75rem;" title="Make Primary Contact">Set Primary</button>`;

      chip.innerHTML = `
        <span class="contact-select" style="cursor: pointer; font-weight: 600;" title="Select this contact">
          ${escapeHtml(c.name)} (${maskDigits(c.phone.replace(/\D/g, ''))})
        </span>
        ${primaryTag}
        <button class="remove-contact-btn" style="background: none; border: none; color: var(--color-danger); cursor: pointer; font-weight: bold; padding: 0 4px;" title="Remove contact">&times;</button>
      `;

      chip.querySelector('.contact-select')!.onclick = () => {
        if (this.elements.phoneInput) {
          this.elements.phoneInput.value = c.phone;
          showToast(`Selected contact: ${c.name}`, 'info');
        }
      };

      const makePrimaryBtn = chip.querySelector('.make-primary-btn');
      if (makePrimaryBtn) {
        (makePrimaryBtn as HTMLElement).onclick = (e) => {
          e.stopPropagation();
          this.setPrimaryContact(c.id);
        };
      }

      chip.querySelector('.remove-contact-btn')!.onclick = (e) => {
        e.stopPropagation();
        this.removeContact(c.id);
      };

      this.elements.contactsListEl!.appendChild(chip);
    });
  }

  private playTone(freq = 700): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  }
}

function maskDigits(digits: string): string {
  if (digits.length <= 4) return '****';
  const prefix = digits.slice(0, 2);
  const suffix = digits.slice(-4);
  const stars = '*'.repeat(Math.max(2, digits.length - 6));
  return `+${prefix} ${stars} ${suffix}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
