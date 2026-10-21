import { themeCtrl } from './themeController.js';

export class KeyboardShortcutsManager {
  private modalEl: HTMLElement | null = null;
  private onToggleSTT?: () => void;
  private onTriggerSOS?: () => void;

  public init(options: { onToggleSTT?: () => void; onTriggerSOS?: () => void }): void {
    this.onToggleSTT = options.onToggleSTT;
    this.onTriggerSOS = options.onTriggerSOS;
    this.modalEl = document.getElementById('shortcutsModal');

    window.addEventListener('keydown', (e) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      // Open Help Modal on '?' when not typing in text field
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        this.openModal();
        return;
      }

      // Close modal on Escape
      if (e.key === 'Escape' && this.modalEl && this.modalEl.style.display !== 'none') {
        this.closeModal();
        return;
      }

      // Alt shortcuts
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'm':
            e.preventDefault();
            if (this.onToggleSTT) this.onToggleSTT();
            break;
          case 'b':
            e.preventDefault();
            document.getElementById('board')?.scrollIntoView({ behavior: 'smooth' });
            break;
          case 'l':
            e.preventDefault();
            document.getElementById('live')?.scrollIntoView({ behavior: 'smooth' });
            break;
          case 't':
            e.preventDefault();
            themeCtrl.cycleTheme();
            break;
          case 's':
            e.preventDefault();
            document.getElementById('sos')?.scrollIntoView({ behavior: 'smooth' });
            if (this.onTriggerSOS) this.onTriggerSOS();
            break;
        }
      }
    });

    const closeBtn = document.getElementById('closeShortcutsBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) {
          this.closeModal();
        }
      });
    }
  }

  public openModal(): void {
    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
      this.modalEl.setAttribute('aria-hidden', 'false');
      const firstFocusable = this.modalEl.querySelector('button');
      firstFocusable?.focus();
    }
  }

  public closeModal(): void {
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
      this.modalEl.setAttribute('aria-hidden', 'true');
    }
  }
}
