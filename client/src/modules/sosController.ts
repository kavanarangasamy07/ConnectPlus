import { SOSContact, SOSRequest, SOSResponse } from '../../shared/types.js';
import { showToast } from './toastController.js';
import { triggerVisualAlert } from './visualAlerts.js';

export class SOSController {
  private contacts: SOSContact[] = [];
  private countdownTimer: any = null;
  private countdownValue = 3;
  private userLocation: { lat: number; lng: number } | null = null;
  private isLocationConsentGranted = false;

  private phoneInput: HTMLInputElement | null = null;
  private messageInput: HTMLTextAreaElement | null = null;
  private contactsListEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private countdownModal: HTMLElement | null = null;
  private countdownCircle: HTMLElement | null = null;

  constructor() {
    this.loadContacts();
  }

  public init(
    phoneInput: HTMLInputElement,
    messageInput: HTMLTextAreaElement,
    contactsList: HTMLElement,
    statusEl: HTMLElement,
    countdownModal: HTMLElement,
    countdownCircle: HTMLElement
  ): void {
    this.phoneInput = phoneInput;
    this.messageInput = messageInput;
    this.contactsListEl = contactsList;
    this.statusEl = statusEl;
    this.countdownModal = countdownModal;
    this.countdownCircle = countdownCircle;

    // Load active contact into phone input if available
    if (this.contacts.length > 0 && !this.phoneInput.value) {
      this.phoneInput.value = this.contacts[0].phone;
    }

    this.renderContacts();
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
            showToast('GPS Location acquired for emergency message', 'success');
          },
          (err) => {
            showToast(`Could not acquire GPS: ${err.message}`, 'info');
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    } else {
      this.userLocation = null;
    }
  }

  public addContact(name: string, phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      showToast('Phone number must have 8 to 15 digits with country code.', 'danger');
      return false;
    }

    if (this.contacts.length >= 3) {
      showToast('Maximum of 3 trusted contacts reached.', 'info');
      return false;
    }

    const contact: SOSContact = {
      id: 'cnt-' + Date.now(),
      name: name.trim() || 'Trusted Contact',
      phone: phone.trim()
    };

    this.contacts.push(contact);
    this.saveContacts();
    this.renderContacts();
    if (this.phoneInput) {
      this.phoneInput.value = contact.phone;
    }
    showToast(`Added contact ${contact.name}`, 'success');
    return true;
  }

  public removeContact(id: string): void {
    this.contacts = this.contacts.filter((c) => c.id !== id);
    this.saveContacts();
    this.renderContacts();
    showToast('Contact removed', 'info');
  }

  public triggerSOS(): void {
    const phone = this.phoneInput?.value.trim() || '';
    const message = this.messageInput?.value.trim() || '';

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      showToast('Please enter a valid emergency phone number (8-15 digits with country code).', 'danger');
      return;
    }

    if (!message) {
      showToast('Please enter an emergency message.', 'danger');
      return;
    }

    // Start 3-second countdown modal
    this.startCountdown();
  }

  public cancelCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.countdownModal) {
      this.countdownModal.classList.remove('active');
    }
    showToast('Emergency SOS cancelled.', 'info');
  }

  private startCountdown(): void {
    this.countdownValue = 3;
    if (this.countdownModal && this.countdownCircle) {
      this.countdownModal.classList.add('active');
      this.countdownCircle.textContent = this.countdownValue.toString();
    }

    this.playBeep(600);

    this.countdownTimer = setInterval(() => {
      this.countdownValue--;
      if (this.countdownCircle) {
        this.countdownCircle.textContent = this.countdownValue.toString();
      }

      if (this.countdownValue > 0) {
        this.playBeep(600);
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        if (this.countdownModal) {
          this.countdownModal.classList.remove('active');
        }
        this.dispatchSOS();
      }
    }, 1000);
  }

  private async dispatchSOS(): Promise<void> {
    const phone = this.phoneInput!.value.trim();
    const message = this.messageInput!.value.trim();

    triggerVisualAlert('SOS sent');

    const payload: SOSRequest = {
      phone,
      message,
      lat: this.isLocationConsentGranted && this.userLocation ? this.userLocation.lat : undefined,
      lng: this.isLocationConsentGranted && this.userLocation ? this.userLocation.lng : undefined
    };

    try {
      const res = await fetch('/api/v1/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('SOS service error');
      }

      const data = (await res.json()) as SOSResponse;

      // Automatically open WhatsApp with noopener, noreferrer
      window.open(data.waUrl, '_blank', 'noopener,noreferrer');

      if (this.statusEl) {
        this.statusEl.innerHTML = `
          <div style="background: var(--color-danger-subtle); border: 1px solid var(--color-danger); padding: 16px; border-radius: 12px; margin-top: 16px;">
            <strong style="color: var(--color-danger);">🚨 SOS Dispatched!</strong>
            <p style="margin: 8px 0;">WhatsApp opened for ${data.phoneMasked}. If WhatsApp didn't open, use the fallbacks below:</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <a href="${data.smsUrl}" class="btn" style="text-decoration: none; padding: 8px 16px; font-size: 0.9rem;">
                📱 Send via SMS
              </a>
              <button class="btn-secondary" id="copySosMsgBtn" style="padding: 8px 16px; font-size: 0.9rem;">
                📋 Copy SOS Message
              </button>
            </div>
          </div>
        `;

        document.getElementById('copySosMsgBtn')?.addEventListener('click', () => {
          navigator.clipboard.writeText(data.message).then(() => {
            showToast('SOS message copied to clipboard!', 'success');
          });
        });
      }
    } catch {
      // Local fallback if backend is unreachable
      const digits = phone.replace(/\D/g, '');
      let fullMsg = message;
      if (this.isLocationConsentGranted && this.userLocation) {
        fullMsg += `\n📍 Current Location: https://maps.google.com/?q=${this.userLocation.lat},${this.userLocation.lng}`;
      }
      const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(fullMsg)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      showToast('Opened WhatsApp emergency link directly', 'info');
    }
  }

  private renderContacts(): void {
    if (!this.contactsListEl) return;
    this.contactsListEl.innerHTML = '';

    if (this.contacts.length === 0) {
      this.contactsListEl.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">No contacts saved yet. Add up to 3 contacts for quick access.</span>`;
      return;
    }

    this.contacts.forEach((c) => {
      const chip = document.createElement('div');
      chip.style.cssText =
        'display: inline-flex; align-items: center; gap: 8px; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); padding: 6px 12px; border-radius: 999px; margin-right: 8px; margin-bottom: 8px; font-size: 0.85rem;';
      chip.innerHTML = `
        <span style="cursor: pointer;" title="Select contact">${escapeHtml(c.name)} (${escapeHtml(c.phone)})</span>
        <button style="background: none; border: none; color: var(--color-danger); padding: 0; min-height: auto; box-shadow: none; cursor: pointer; font-weight: bold;" title="Remove contact">&times;</button>
      `;

      chip.querySelector('span')!.onclick = () => {
        if (this.phoneInput) {
          this.phoneInput.value = c.phone;
          showToast(`Selected contact: ${c.name}`, 'info');
        }
      };

      chip.querySelector('button')!.onclick = () => {
        this.removeContact(c.id);
      };

      this.contactsListEl!.appendChild(chip);
    });
  }

  private loadContacts(): void {
    const raw = localStorage.getItem('connectplus_sos_contacts');
    if (raw) {
      try {
        this.contacts = JSON.parse(raw);
      } catch {}
    }
  }

  private saveContacts(): void {
    localStorage.setItem('connectplus_sos_contacts', JSON.stringify(this.contacts));
  }

  private playBeep(freq = 600): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
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
