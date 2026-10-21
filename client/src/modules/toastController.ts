export interface ToastAction {
  label: string;
  onClick: () => void;
}

export function showToast(
  message: string,
  type: 'info' | 'success' | 'danger' = 'info',
  action?: ToastAction,
  duration = 4500
): void {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', type === 'danger' ? 'alert' : 'status');

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  if (action) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'btn-secondary';
    actionBtn.style.padding = '4px 12px';
    actionBtn.style.fontSize = '0.85rem';
    actionBtn.style.minHeight = '32px';
    actionBtn.textContent = action.label;
    actionBtn.onclick = () => {
      action.onClick();
      dismissToast();
    };
    toast.appendChild(actionBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.style.background = 'transparent';
  closeBtn.style.color = 'inherit';
  closeBtn.style.padding = '4px 8px';
  closeBtn.style.minHeight = '32px';
  closeBtn.style.boxShadow = 'none';
  closeBtn.setAttribute('aria-label', 'Close toast');
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => dismissToast();
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  const timeoutId = setTimeout(() => {
    dismissToast();
  }, duration);

  function dismissToast() {
    clearTimeout(timeoutId);
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 200);
  }
}
