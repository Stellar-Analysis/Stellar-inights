/**
 * WebSocket client for real-time updates from the Stellar Analysis backend
 */
import { logger } from "@/lib/logger";
import { config } from "@/config";
import {
  WsMessage,
  parseWebSocketMessage,
  isPing,
  isPong,
  isConnected,
} from "@/lib/websocket-message-parser";

export type WsMessageType =
  | "snapshot_update"
  | "corridor_update"
  | "anchor_update"
  | "ping"
  | "pong"
  | "connected"
  | "error"
  | "health_alert"
  | "new_payment"
  | "subscription_confirm";

// Re-export types from parser
export type {
  WsSnapshotUpdate,
  WsCorridorUpdate,
  WsAnchorUpdate,
  WsPing,
  WsPong,
  WsConnected,
  WsError,
  WsHealthAlert,
  WsNewPayment,
  WsSubscriptionConfirm,
} from "@/lib/websocket-message-parser";

export type WsEventHandler = (message: WsMessage) => void;

export interface WebSocketConfig {
  url?: string;
  token?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class StellarInsightsWebSocket {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private listeners: Map<WsMessageType, Set<WsEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private connectionId: string | null = null;

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: config.url || this.getDefaultWsUrl(),
      token: config.token || "",
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
    };
  }

  /**
   * Get the default WebSocket URL based on the current environment
   */
  private getDefaultWsUrl(): string {
    return config.wsUrl;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.debug("WebSocket already connected");
      return;
    }

    this.isManualClose = false;

    try {
      const url = new URL(this.config.url);
      if (this.config.token) {
        url.searchParams.set("token", this.config.token);
      }

      logger.debug("Connecting to WebSocket:", url.toString());
      this.ws = new WebSocket(url.toString());

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      logger.error("Failed to create WebSocket connection:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionId = null;
    logger.debug("WebSocket disconnected");
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get the connection ID (if connected)
   */
  public getConnectionId(): string | null {
    return this.connectionId;
  }

  /**
   * Subscribe to a specific message type
   */
  public on(type: WsMessageType, handler: WsEventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  /**
   * Subscribe to all message types
   */
  public onAny(handler: WsEventHandler): () => void {
    const unsubscribers: Array<() => void> = [];

    const types: WsMessageType[] = [
      "snapshot_update",
      "corridor_update",
      "anchor_update",
      "ping",
      "pong",
      "connected",
      "error",
    ];

    types.forEach((type) => {
      unsubscribers.push(this.on(type, handler));
    });

    // Return function to unsubscribe from all
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Send a ping message
   */
  public ping(): void {
    if (!this.isConnected()) {
      logger.warn("Cannot send ping: WebSocket not connected");
      return;
    }

    const message: WsPing = {
      type: "ping",
      timestamp: Date.now(),
    };

    this.send(message);
  }

  /**
   * Send a message to the server
   */
  private send(message: WsPing | WsPong): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn("Cannot send message: WebSocket not connected");
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error("Failed to send message:", error);
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    logger.debug("WebSocket connected");
    this.reconnectAttempts = 0;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const parsedData = JSON.parse(event.data);
      const message = parseWebSocketMessage(parsedData);

      // Ignore malformed messages
      if (!message) {
        return;
      }

      // Store connection ID when connected
      if (isConnected(message)) {
        this.connectionId = message.connection_id;
      }

      // Automatically respond to pings with pongs
      if (isPing(message)) {
        const pong: { type: "pong"; timestamp: number } = {
          type: "pong",
          timestamp: message.timestamp,
        };
        this.send(pong);
      }

      // Notify all registered listeners
      const handlers = this.listeners.get(
        message.type as WsMessageType
      );
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(message);
          } catch (error) {
            logger.error("Error in message handler:", error);
          }
        });
      }
    } catch (error) {
      logger.error("Failed to parse WebSocket message:", error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Event): void {
    logger.error("WebSocket error:", error);

    const errorMessage: WsError = {
      type: "error",
      message: "WebSocket connection error",
    };

    const handlers = this.listeners.get("error");
    if (handlers) {
      handlers.forEach((handler) => handler(errorMessage));
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    logger.debug(
      `WebSocket closed: code=${event.code}, reason=${event.reason || "none"}`,
    );

    this.connectionId = null;

    if (!this.isManualClose && this.config.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error(
        `Max reconnection attempts (${this.config.maxReconnectAttempts}) reached`,
      );
      return;
    }

    this.reconnectAttempts++;

    const delay = this.config.reconnectInterval * this.reconnectAttempts;
    logger.debug(
      `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// Singleton instance for easy access
let wsInstance: StellarInsightsWebSocket | null = null;

/**
 * Get the singleton WebSocket instance
 */
export function getWebSocketInstance(
  config?: WebSocketConfig,
): StellarInsightsWebSocket {
  if (!wsInstance) {
    wsInstance = new StellarInsightsWebSocket(config);
  }
  return wsInstance;
}

/**
 * Reset the WebSocket singleton (useful for testing)
 */
export function resetWebSocketInstance(): void {
  if (wsInstance) {
    wsInstance.disconnect();
    wsInstance = null;
  }
}
