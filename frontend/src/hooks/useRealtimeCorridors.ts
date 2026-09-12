import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import { useStableCallback } from "./useStableCallback";
import { logger } from "@/lib/logger";
import { config } from "@/config";
import {
  WsCorridorUpdate,
  WsHealthAlert,
  WsNewPayment,
  WsSubscriptionConfirm,
  WsPing,
  WsUnknownMessage,
  isCorridorUpdate,
  isHealthAlert,
  isNewPayment,
  isSubscriptionConfirm,
  isPing,
} from "@/lib/websocket-message-parser";

export interface CorridorUpdate extends WsCorridorUpdate {
  asset_a_code: string;
  asset_a_issuer: string;
  asset_b_code: string;
  asset_b_issuer: string;
  health_score?: number;
}

export type HealthAlert = WsHealthAlert;

export type NewPayment = WsNewPayment;

export interface UseRealtimeCorridorsOptions {
  corridorKeys?: string[];
  enablePaymentStream?: boolean;
  onCorridorUpdate?: (update: CorridorUpdate) => void;
  onHealthAlert?: (alert: HealthAlert) => void;
  onNewPayment?: (payment: NewPayment) => void;
}

export interface UseRealtimeCorridorsReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isStaleData: boolean;
  connectionAttempts: number;
  corridorUpdates: Map<string, CorridorUpdate>;
  healthAlerts: HealthAlert[];
  recentPayments: NewPayment[];
  subscribeToCorridors: (corridorKeys: string[]) => void;
  unsubscribeFromCorridors: (corridorKeys: string[]) => void;
  clearHealthAlerts: () => void;
  reconnect: () => void;
}

export function useRealtimeCorridors(
  options: UseRealtimeCorridorsOptions = {},
): UseRealtimeCorridorsReturn {
  const {
    corridorKeys = [],
    enablePaymentStream = false,
    onCorridorUpdate,
    onHealthAlert,
    onNewPayment,
  } = options;

  const [corridorUpdates, setCorridorUpdates] = useState<
    Map<string, CorridorUpdate>
  >(new Map());
  const [healthAlerts, setHealthAlerts] = useState<HealthAlert[]>([]);
  const [recentPayments, setRecentPayments] = useState<NewPayment[]>([]);

  // Track current subscriptions for resubscription on reconnect
  const subscribedKeysRef = useRef<string[]>([]);

  // Get WebSocket URL from environment or default
  const wsUrl = config.wsUrl;

  const handleMessage = useCallback(
    (message: WsCorridorUpdate | WsHealthAlert | WsNewPayment | WsSubscriptionConfirm | WsPing | WsUnknownMessage) => {
      if (isCorridorUpdate(message)) {
        setCorridorUpdates((prev) => {
          const newMap = new Map(prev);
          newMap.set(message.corridor_key, message as CorridorUpdate);
          return newMap;
        });
        onCorridorUpdate?.(message as CorridorUpdate);
      } else if (isHealthAlert(message)) {
        setHealthAlerts((prev) => [message, ...prev].slice(0, 50));
        onHealthAlert?.(message);
      } else if (isNewPayment(message)) {
        if (enablePaymentStream) {
          setRecentPayments((prev) => [message, ...prev].slice(0, 100));
          onNewPayment?.(message);
        }
      } else if (isSubscriptionConfirm(message)) {
        logger.debug("Subscription confirmed for channels:", message.channels);
      } else if (isPing(message)) {
        // Ignore pings silently
      } else {
        logger.debug("Unhandled WebSocket message type:", message.type);
      }
    },
    [enablePaymentStream, onCorridorUpdate, onHealthAlert, onNewPayment],
  );

  // Stable identities: useWebSocket's `connect` (and the effect that opens
  // the socket) is keyed off these callbacks' identity. onOpen in particular
  // needs `subscribe`, which only exists after this useWebSocket call
  // returns, so a plain useCallback with a real dependency array can't work
  // here - a fresh inline function on every render was recreating `connect`
  // constantly, tearing the socket down and reopening it on every render
  // during the initial render cascade (dozens of connect/error cycles in
  // the first couple of seconds, all logged, before things settled).
  const stableOnOpen = useStableCallback(() => {
    logger.debug("Connected to corridor WebSocket");
    // Re-subscribe to all previously subscribed corridors on reconnection
    const keys = subscribedKeysRef.current;
    if (keys.length > 0) {
      const channels = keys.map((key) => `corridor:${key}`);
      if (enablePaymentStream) {
        channels.push(...keys.map((key) => `payments:${key}`));
      }
      subscribe(channels);
      logger.debug("Resubscribed to corridors after reconnect:", keys);
    }
  });
  const stableOnClose = useStableCallback(() => {
    logger.debug("Disconnected from corridor WebSocket");
  });
  const stableOnError = useStableCallback((error: Event) => {
    logger.error("Corridor WebSocket error:", error);
  });
  const stableOnStaleData = useStableCallback(() => {
    logger.warn("Corridor data is stale - consider fetching snapshot");
  });

  const {
    isConnected,
    isConnecting,
    isStaleData,
    connectionAttempts,
    subscribe,
    unsubscribe,
    reconnect,
  } = useWebSocket(wsUrl, {
    staleDataThreshold: 30000, // 30 seconds without updates = stale
    onMessage: handleMessage,
    onOpen: stableOnOpen,
    onClose: stableOnClose,
    onError: stableOnError,
    onStaleData: stableOnStaleData,
  });

  const subscribeToCorridors = useCallback(
    (keys: string[]) => {
      // Track subscribed keys for resubscription
      subscribedKeysRef.current = keys;
      const channels = keys.map((key) => `corridor:${key}`);
      if (enablePaymentStream) {
        channels.push(...keys.map((key) => `payments:${key}`));
      }
      subscribe(channels);
    },
    [subscribe, enablePaymentStream],
  );

  const unsubscribeFromCorridors = useCallback(
    (keys: string[]) => {
      // Remove unsubscribed keys from tracking
      subscribedKeysRef.current = subscribedKeysRef.current.filter(
        (k) => !keys.includes(k),
      );
      const channels = keys.map((key) => `corridor:${key}`);
      if (enablePaymentStream) {
        channels.push(...keys.map((key) => `payments:${key}`));
      }
      unsubscribe(channels);
    },
    [unsubscribe, enablePaymentStream],
  );

  const clearHealthAlerts = useCallback(() => {
    setHealthAlerts([]);
  }, []);

  // Subscribe to initial corridors when connected
  useEffect(() => {
    if (isConnected && corridorKeys.length > 0) {
      subscribeToCorridors(corridorKeys);
    }
  }, [isConnected, corridorKeys, subscribeToCorridors]);

  return {
    isConnected,
    isConnecting,
    isStaleData,
    connectionAttempts,
    corridorUpdates,
    healthAlerts,
    recentPayments,
    subscribeToCorridors,
    unsubscribeFromCorridors,
    clearHealthAlerts,
    reconnect,
  };
}
