import { showToast } from './toastController.js';

export type ThemeMode = 'light' | 'dark' | 'high-contrast';

export class ThemeController {
  private currentTheme: ThemeMode = 'light';
  private toggleBtn: HTMLElement | null = null;

  constructor() {
    this.initTheme();
  }

  public init(toggleBtn: HTMLElement): void {
    this.toggleBtn = toggleBtn;
    this.updateButtonUI();

    this.toggleBtn.addEventListener('click', () => {
      this.cycleTheme();
    });
  }

  public getTheme(): ThemeMode {
    return this.currentTheme;
  }

  public setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('connectplus_theme', theme);
    this.updateButtonUI();
    showToast(`Switched to ${theme.toUpperCase()} theme`, 'info');
  }

  public cycleTheme(): void {
    if (this.currentTheme === 'light') {
      this.setTheme('dark');
    } else if (this.currentTheme === 'dark') {
      this.setTheme('high-contrast');
    } else {
      this.setTheme('light');
    }
  }

  private initTheme(): void {
    const saved = localStorage.getItem('connectplus_theme') as ThemeMode;
    if (saved && (saved === 'light' || saved === 'dark' || saved === 'high-contrast')) {
      this.currentTheme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.currentTheme = 'dark';
    } else {
      this.currentTheme = 'light';
    }
    document.body.setAttribute('data-theme', this.currentTheme);
  }

  private updateButtonUI(): void {
    if (!this.toggleBtn) return;
    let label = '🌙 Theme: Light';
    if (this.currentTheme === 'dark') {
      label = '☀️ Theme: Dark';
    } else if (this.currentTheme === 'high-contrast') {
      label = '⚡ Theme: High-Contrast';
    }
    this.toggleBtn.textContent = label;
    this.toggleBtn.setAttribute('aria-label', `Current theme is ${this.currentTheme}. Click to cycle theme.`);
    this.toggleBtn.setAttribute('aria-pressed', (this.currentTheme !== 'light').toString());
  }
}

export const themeCtrl = new ThemeController();
