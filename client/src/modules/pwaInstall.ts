import { showToast } from './toastController.js';

let deferredPrompt: any = null;

export function initPWA(): void {
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('ConnectPlus Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });
    });
  }

  // Handle PWA installation prompt
  const installBtns = document.querySelectorAll('.install-pwa-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtns.forEach((btn) => {
      (btn as HTMLElement).style.display = 'inline-flex';
      btn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            showToast('Thank you for installing ConnectPlus!', 'success');
          }
          deferredPrompt = null;
          installBtns.forEach((b) => ((b as HTMLElement).style.display = 'none'));
        }
      });
    });
  });

  window.addEventListener('appinstalled', () => {
    showToast('ConnectPlus was installed successfully!', 'success');
    installBtns.forEach((btn) => ((btn as HTMLElement).style.display = 'none'));
  });

  // Offline / Online network notifications
  window.addEventListener('offline', () => {
    showToast('You are now working offline. Offline communication tools remain active.', 'info');
  });

  window.addEventListener('online', () => {
    showToast('Internet connection restored! Syncing with server...', 'success');
  });
}
