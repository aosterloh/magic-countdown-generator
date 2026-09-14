/**
 * Browser Notification & Tab Title Pulsing Utilities
 */

let originalTitle = typeof document !== 'undefined' ? document.title : 'Magic Countdown';
let titlePulseInterval: NodeJS.Timeout | null = null;

export function getOriginalTitle(): string {
  return originalTitle;
}

export function setOriginalTitle(title: string): void {
  originalTitle = title;
}

/**
 * Request desktop notification permission non-intrusively
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Dispatch desktop notification (e.g. when videos or master finish)
 */
export function sendDesktopNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        silent: false,
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (err) {
      console.warn('Failed to send desktop notification:', err);
    }
  }
}

/**
 * Start pulsing the browser tab title back and forth to catch user's attention
 * e.g. "🔔 (10/10 READY!)" <-> "Magic Countdown"
 */
export function startTitlePulsing(alertText: string, baseText?: string): void {
  if (typeof document === 'undefined') return;

  const base = baseText || originalTitle || 'Magic Countdown';
  stopTitlePulsing();

  let isAlert = true;
  document.title = alertText;

  titlePulseInterval = setInterval(() => {
    document.title = isAlert ? base : alertText;
    isAlert = !isAlert;
  }, 1000);

  // Automatically stop pulsing as soon as user returns to the tab or clicks anywhere
  const handleUserReturn = () => {
    stopTitlePulsing();
    window.removeEventListener('focus', handleUserReturn);
    window.removeEventListener('click', handleUserReturn);
  };

  window.addEventListener('focus', handleUserReturn);
  window.addEventListener('click', handleUserReturn);
}

/**
 * Stop pulsing and restore standard document title
 */
export function stopTitlePulsing(): void {
  if (titlePulseInterval) {
    clearInterval(titlePulseInterval);
    titlePulseInterval = null;
  }
  if (typeof document !== 'undefined') {
    document.title = originalTitle || 'Magic Countdown';
  }
}
