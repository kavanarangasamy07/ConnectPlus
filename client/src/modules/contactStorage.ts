import { SOSContact } from '../../shared/types.js';

const STORAGE_KEY = 'connectplus_sec_contacts';
// Nonce salt for obfuscating phone numbers in local storage
const SALT = 'CP-A11Y-SECURE-NONCE-v1';

/**
 * Encodes string to avoid plain-text storage of phone numbers and PII
 */
function obfuscate(data: string): string {
  try {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(encodeURIComponent(result));
  } catch {
    return btoa(encodeURIComponent(data));
  }
}

/**
 * Decodes obfuscated storage string
 */
function deobfuscate(encoded: string): string {
  try {
    const raw = decodeURIComponent(atob(encoded));
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    try {
      return decodeURIComponent(atob(encoded));
    } catch {
      return '';
    }
  }
}

export class ContactStorage {
  public static loadContacts(): SOSContact[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy plain-text key and migrate/remove it if found
      const legacy = localStorage.getItem('connectplus_sos_contacts');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy) as SOSContact[];
          localStorage.removeItem('connectplus_sos_contacts');
          ContactStorage.saveContacts(parsed);
          return parsed;
        } catch {
          localStorage.removeItem('connectplus_sos_contacts');
        }
      }
      return [];
    }

    try {
      const decoded = deobfuscate(raw);
      const parsed = JSON.parse(decoded) as SOSContact[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public static saveContacts(contacts: SOSContact[]): void {
    try {
      const jsonStr = JSON.stringify(contacts);
      const protectedStr = obfuscate(jsonStr);
      localStorage.setItem(STORAGE_KEY, protectedStr);
    } catch (e) {
      console.warn('Failed to save secure contacts:', e);
    }
  }

  public static getPrimaryContact(): SOSContact | null {
    const contacts = ContactStorage.loadContacts();
    if (contacts.length === 0) return null;
    const primary = contacts.find((c) => c.isPrimary);
    return primary || contacts[0];
  }
}
