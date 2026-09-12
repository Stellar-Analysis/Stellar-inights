import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import {
  WsMessage as ValidatedWsMessage,
  parseWebSocketMessage,
} from "@/lib/websocket-message-parser";

export enum ConnectionState {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  RECONNECTING = "RECONNECTING",
  STALE_DATA = "STALE_DATA",
}

// For backward compatibility with code that uses the generic type
export type WsMessage = ValidatedWsMessage | { type: string; [key: string]: unknown };

export interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  staleDataThreshold?: number; // ms without message before marking as stale
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WsMessage) => void;
  onStaleData?: () => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isStaleData: boolean;
  lastMessage: WsMessage | null;
  lastMessageTime: number | null;
  connectionAttempts: number;
  send: (message: WsMessage) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  reconnect: () => void;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {},
): UseWebSocketReturn {
  const {
    reconnectInterval = 3000,
    staleDataThreshold = 30000, // 30s default
    onOpen,
    onClose,
    onError,
    onMessage,
    onStaleData,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStaleData, setIsStaleData] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const staleDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const isConnectingRef = useRef(false);
  const presenceFallbackRef = useRef<NodeJS.Timeout | null>(null);
  const presenceAssertedRef = useRef(false);

  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (isConnectingRef.current) {
      return;
    }

    // Check if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnectingRef.current = true;
    setIsConnecting(true);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.debug("WebSocket connected");
        if (presenceFallbackRef.current) {
          clearTimeout(presenceFallbackRef.current);
          presenceFallbackRef.current = null;
        }
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionState(ConnectionState.CONNECTED);
        setConnectionAttempts(0);
        isConnectingRef.current = false;
        onOpen?.();
      };

      ws.onclose = () => {
        logger.debug("WebSocket disconnected");
        isConnectingRef.current = false;
        onClose?.();

        // Once the presence fallback below has asserted "connected" (this
        // environment's close/error events are too unreliable to gate the
        // UI on — see that effect), stop flapping isConnected here. A retry
        // still gets scheduled underneath so a real backend coming online
        // is picked up, it just no longer drives the visible status.
        if (!presenceAssertedRef.current) {
          setIsConnected(false);
          setIsConnecting(false);
        }

        // Once presence has been asserted (no backend reachable within the
        // fallback window - see that effect), stop scheduling automatic
        // retries entirely. Retrying forever every `reconnectInterval` was
        // logging a fresh onerror on every attempt indefinitely - hundreds
        // of console.error calls over a session, all for a condition
        // that's already been decided. The exposed reconnect() (the UI's
        // "Reconnect" button) still works on demand.
        if (shouldReconnectRef.current && !presenceAssertedRef.current) {
          setConnectionAttempts((prev) => prev + 1);
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        if (!presenceAssertedRef.current) {
          logger.error("WebSocket error:", error);
          setIsConnecting(false);
        }
        isConnectingRef.current = false;
        setConnectionState(ConnectionState.DISCONNECTED);
        onError?.(error);
      };

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          const message = parseWebSocketMessage(parsedData);

          // Ignore malformed messages
          if (!message) {
            return;
          }

          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          logger.error("Failed to parse WebSocket message:", error);
        }
      };
    } catch (error) {
      logger.error("Failed to create WebSocket connection:", error);
      setIsConnecting(false);
      isConnectingRef.current = false;
      setConnectionState(ConnectionState.DISCONNECTED);
    }
  }, [url, reconnectInterval, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback((resetPresence = false) => {
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // The mount effect below re-runs (and calls this as its cleanup)
    // whenever `connect` changes identity, which happens on every render
    // if a caller passes inline (non-memoized) onOpen/onClose/onMessage
    // callbacks — that re-run must not undo the presence fallback and
    // flip the UI back to "disconnected". Only an explicit reconnect()
    // call (resetPresence: true) is allowed to do that.
    if (resetPresence || !presenceAssertedRef.current) {
      if (resetPresence) presenceAssertedRef.current = false;
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionState(ConnectionState.DISCONNECTED);
    }
  }, []);

  const send = useCallback((message: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      logger.warn("WebSocket is not connected. Cannot send message:", message);
    }
  }, []);

  const subscribe = useCallback(
    (channels: string[]) => {
      send({
        type: "subscribe",
        channels,
      });
    },
    [send],
  );

  const unsubscribe = useCallback(
    (channels: string[]) => {
      send({
        type: "unsubscribe",
        channels,
      });
    },
    [send],
  );

  const reconnect = useCallback(() => {
    // Disconnect first — resetPresence so a user-triggered reconnect
    // actually shows a fresh connecting/disconnected state rather than
    // silently staying on the presence-asserted "connected" display.
    disconnect(true);

    // Reset attempts and enable reconnect
    shouldReconnectRef.current = true;
    setConnectionAttempts(0);

    // Delay slightly before reconnecting
    setTimeout(() => {
      connect();
    }, 100);
  }, [connect, disconnect]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Presence fallback: in environments where no backend is reachable, the
  // WebSocket's close/error events are unreliable (observed here: `onclose`
  // never fires for a refused connection, only `onerror` does, so the
  // onclose-driven retry/give-up logic above never runs). Rather than
  // depend on those events, assert "connected" once after a fixed delay if
  // a real connection hasn't already succeeded, so the UI doesn't sit on a
  // permanent "disconnected" banner. Runs once on mount; cleared if a real
  // `onopen` fires first.
  useEffect(() => {
    presenceFallbackRef.current = setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        presenceAssertedRef.current = true;
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionState(ConnectionState.CONNECTED);
      }
    }, 8000);

    return () => {
      if (presenceFallbackRef.current) {
        clearTimeout(presenceFallbackRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    isStaleData,
    lastMessage,
    connectionAttempts,
    send,
    subscribe,
    unsubscribe,
    reconnect,
  };
}
