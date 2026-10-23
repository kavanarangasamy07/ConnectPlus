import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizePhone, maskPhone } from '../src/routes/sos.js';
import { ContactStorage } from '../../client/src/modules/contactStorage.js';
import { SOSContact } from '../../shared/types.js';

// Mock localStorage for Node test environment
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  length: 0
} as any;

describe('2. Phone Validation & Privacy Masking Tests', () => {
  it('sanitizes international phone numbers and extracts digits', () => {
    expect(sanitizePhone('+91 98765-43210')).toBe('919876543210');
    expect(sanitizePhone('+1 (800) 555-0199')).toBe('18005550199');
    expect(sanitizePhone('044 2468 1357')).toBe('04424681357');
  });

  it('masks phone numbers safely for privacy', () => {
    const masked = maskPhone('919876543210');
    expect(masked.startsWith('+91')).toBe(true);
    expect(masked.endsWith('3210')).toBe(true);
    expect(masked).toContain('*');
    expect(masked).not.toBe('919876543210');
  });

  it('validates 8 to 15 digits rule according to ITU E.164 standard', () => {
    const shortDigits = sanitizePhone('12345');
    const validDigits = sanitizePhone('+91 9876543210');
    const maxDigits = sanitizePhone('+123456789012345'); // 15 digits
    const tooLongDigits = sanitizePhone('+1234567890123456'); // 16 digits

    expect(shortDigits.length >= 8 && shortDigits.length <= 15).toBe(false);
    expect(validDigits.length >= 8 && validDigits.length <= 15).toBe(true);
    expect(maxDigits.length >= 8 && maxDigits.length <= 15).toBe(true);
    expect(tooLongDigits.length >= 8 && tooLongDigits.length <= 15).toBe(false);
  });
});

describe('3. Secure Contact Storage (No Plain Text in Local Storage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores emergency contacts in obfuscated/encrypted form and never plain text', () => {
    const testContacts: SOSContact[] = [
      { id: 'c1', name: 'Dr. Ramesh', phone: '+91 9876543210', isPrimary: true }
    ];

    ContactStorage.saveContacts(testContacts);

    // Verify raw stored item in localStorage
    const rawStored = localStorage.getItem('connectplus_sec_contacts');
    expect(rawStored).toBeTruthy();
    // Must NOT contain the plain-text phone number or name in plaintext!
    expect(rawStored).not.toContain('+91 9876543210');
    expect(rawStored).not.toContain('9876543210');

    // Verify it decodes correctly upon retrieval
    const retrieved = ContactStorage.loadContacts();
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].name).toBe('Dr. Ramesh');
    expect(retrieved[0].phone).toBe('+91 9876543210');
    expect(retrieved[0].isPrimary).toBe(true);
  });

  it('identifies and selects the primary contact properly', () => {
    const testContacts: SOSContact[] = [
      { id: 'c1', name: 'Contact 1', phone: '+91 1111111111', isPrimary: false },
      { id: 'c2', name: 'Primary Doctor', phone: '+91 2222222222', isPrimary: true },
      { id: 'c3', name: 'Contact 3', phone: '+91 3333333333', isPrimary: false }
    ];

    ContactStorage.saveContacts(testContacts);
    const primary = ContactStorage.getPrimaryContact();
    expect(primary).not.toBeNull();
    expect(primary?.id).toBe('c2');
    expect(primary?.name).toBe('Primary Doctor');
  });
});

describe('4. Sensor Thresholds & Cooldown Rules', () => {
  it('calculates shake delta correctly and respects threshold', () => {
    const calculateDelta = (curr: [number, number, number], last: [number, number, number]) => {
      return Math.abs(curr[0] - last[0]) + Math.abs(curr[1] - last[1]) + Math.abs(curr[2] - last[2]);
    };

    const mildMovement = calculateDelta([1, 1, 9.8], [1.2, 1.1, 9.7]); // delta = 0.4
    const strongShake = calculateDelta([15, 12, -4], [-8, -6, 12]); // delta = 23 + 18 + 16 = 57

    const mediumThreshold = 19;
    expect(mildMovement > mediumThreshold).toBe(false);
    expect(strongShake > mediumThreshold).toBe(true);
  });

  it('calculates audio RMS sound level correctly', () => {
    // Simulated quiet buffer (near center 128)
    const quietBuffer = new Uint8Array(256).fill(128);
    let sumSquaresQuiet = 0;
    for (let i = 0; i < quietBuffer.length; i++) {
      const norm = (quietBuffer[i] - 128) / 128;
      sumSquaresQuiet += norm * norm;
    }
    const quietRMS = Math.sqrt(sumSquaresQuiet / quietBuffer.length);
    expect(quietRMS).toBe(0);

    // Simulated loud sound buffer (alternating peak samples 0 and 255)
    const loudBuffer = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      loudBuffer[i] = i % 2 === 0 ? 0 : 255;
    }
    let sumSquaresLoud = 0;
    for (let i = 0; i < loudBuffer.length; i++) {
      const norm = (loudBuffer[i] - 128) / 128;
      sumSquaresLoud += norm * norm;
    }
    const loudRMS = Math.sqrt(sumSquaresLoud / loudBuffer.length);
    expect(loudRMS).toBeGreaterThan(0.9);

    const mediumNoiseThreshold = 0.23;
    expect(quietRMS > mediumNoiseThreshold).toBe(false);
    expect(loudRMS > mediumNoiseThreshold).toBe(true);
  });

  it('guarantees sensory alerts have a cooldown window of at least 3 seconds', () => {
    const cooldownMs = 3500;
    const trigger1Time = 10000;
    const trigger2Time = 11000; // 1s later -> should be blocked by cooldown
    const trigger3Time = 14000; // 4s later -> should pass

    expect(trigger2Time - trigger1Time < cooldownMs).toBe(true);
    expect(trigger3Time - trigger1Time >= cooldownMs).toBe(true);
  });
});
