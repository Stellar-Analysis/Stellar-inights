// PWA utilities for offline detection and SW status

let isOnline = typeof window !== 'undefined' && 'onLine' in navigator ? navigator.onLine : true;

export function addOfflineListener(callback: (online: boolean) => void): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    isOnline = true;
    callback(true);
  });
  window.addEventListener('offline', () => {
    isOnline = false;
    callback(false);
  });
}

export function isOffline(): boolean {
  return !isOnline;
}

export async function getSWStatus(): Promise<'supported' | 'unsupported' | 'no-permission' | 'registered'> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration.active ? 'registered' : 'supported';
  } catch {
    return 'no-permission';
  }
}

export function registerSW(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js');
}
