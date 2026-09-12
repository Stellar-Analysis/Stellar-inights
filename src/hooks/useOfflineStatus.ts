'use client';

import { useEffect, useState, useCallback } from 'react';

export interface OfflineStatus {
  isOnline: boolean;
  /** True if the user was previously offline and just came back */
  justReconnected: boolean;
  /** Timestamp when the connection was lost, null if currently online */
  offlineSince: Date | null;
}

/**
 * Lightweight hook that tracks online/offline status.
 * Separate from useProgressiveWebApp so any component can consume it
 * without pulling in the full PWA installation machinery.
 */
export function useOfflineStatus(): OfflineStatus {
  // Always start "online" so the first client render matches the server
  // render exactly (SSR has no navigator, so it can only ever render the
  // online state). The real value is picked up immediately after mount via
  // the effect below — reading navigator.onLine in the initializer instead
  // caused a hydration mismatch whenever the client's actual online state
  // at hydration time happened to be false.
  const [isOnline, setIsOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);

  useEffect(() => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setOfflineSince(new Date());
    }
  }, []);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setOfflineSince(null);
    setJustReconnected(true);
    // Clear the "just reconnected" flag after 4 s
    setTimeout(() => setJustReconnected(false), 4000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setOfflineSince(new Date());
    setJustReconnected(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, justReconnected, offlineSince };
}
