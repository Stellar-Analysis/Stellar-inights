import { logger } from "@/lib/logger";

// Discriminated union types for all WebSocket message payloads
export interface WsSnapshotUpdate {
  type: "snapshot_update";
  snapshot_id: string;
  epoch: number;
  timestamp: string;
  hash: string;
}

export interface WsCorridorUpdate {
  type: "corridor_update";
  corridor_id: string;
  corridor_key: string;
  success_rate: number;
  volume_usd: number;
  total_transactions: number;
}

export interface WsAnchorUpdate {
  type: "anchor_update";
  anchor_id: string;
  name: string;
  reliability_score: number;
  status: string;
}

export interface WsPing {
  type: "ping";
  timestamp: number;
}

export interface WsPong {
  type: "pong";
  timestamp: number;
}

export interface WsConnected {
  type: "connected";
  connection_id: string;
}

export interface WsError {
  type: "error";
  message: string;
}

export interface WsHealthAlert {
  type: "health_alert";
  corridor_id: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  timestamp: string;
}

export interface WsNewPayment {
  type: "new_payment";
  corridor_id: string;
  amount: number;
  successful: boolean;
  timestamp: string;
}

export interface WsSubscriptionConfirm {
  type: "subscription_confirm";
  channels?: string[];
}

export interface WsUnknownMessage {
  type: string;
  [key: string]: unknown;
}

export type WsMessage =
  | WsSnapshotUpdate
  | WsCorridorUpdate
  | WsAnchorUpdate
  | WsPing
  | WsPong
  | WsConnected
  | WsError
  | WsHealthAlert
  | WsNewPayment
  | WsSubscriptionConfirm;

// Type guards for each message type
export function isSnapshotUpdate(msg: unknown): msg is WsSnapshotUpdate {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>).type === "snapshot_update" &&
    typeof (msg as Record<string, unknown>).snapshot_id === "string" &&
    typeof (msg as Record<string, unknown>).epoch === "number" &&
    typeof (msg as Record<string, unknown>).timestamp === "string" &&
    typeof (msg as Record<string, unknown>).hash === "string"
  );
}

export function isCorridorUpdate(msg: unknown): msg is WsCorridorUpdate {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>).type === "corridor_update" &&
    typeof (msg as Record<string, unknown>).corridor_id === "string" &&
    typeof (msg as Record<string, unknown>).corridor_key === "string" &&
    typeof (msg as Record<string, unknown>).success_rate === "number" &&
    typeof (msg as Record<string, unknown>).volume_usd === "number" &&
    typeof (msg as Record<string, unknown>).total_transactions === "number"
  );
}

export function isAnchorUpdate(msg: unknown): msg is WsAnchorUpdate {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>).type === "anchor_update" &&
    typeof (msg as Record<string, unknown>).anchor_id === "string" &&
    typeof (msg as Record<string, unknown>).name === "string" &&
    typeof (msg as Record<string, unknown>).reliability_score === "number" &&
    typeof (msg as Record<string, unknown>).status === "string"
  );
}

export function isPing(msg: unknown): msg is WsPing {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>).type === "ping" &&
    typeof (msg as Record<string, unknown>).timestamp === "number"
  );
}

export function isPong(msg: unknown): msg is WsPong {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>).type === "pong" &&
    typeof (msg as Record<string, unknown>).timestamp === "number"
  );
}

export function isConnected(msg: unknown): msg is WsConnected {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>).type === "connected" &&
    typeof (msg as Record<string, unknown>).connection_id === "string"
  );
}

export function isError(msg: unknown): msg is WsError {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>).type === "error" &&
    typeof (msg as Record<string, unknown>).message === "string"
  );
}

export function isHealthAlert(msg: unknown): msg is WsHealthAlert {
  const severities = ["info", "warning", "error", "critical"];
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>).type === "health_alert" &&
    typeof (msg as Record<string, unknown>).corridor_id === "string" &&
    severities.includes((msg as Record<string, unknown>).severity as string) &&
    typeof (msg as Record<string, unknown>).message === "string" &&
    typeof (msg as Record<string, unknown>).timestamp === "string"
  );
}

export function isNewPayment(msg: unknown): msg is WsNewPayment {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>).type === "new_payment" &&
    typeof (msg as Record<string, unknown>).corridor_id === "string" &&
    typeof (msg as Record<string, unknown>).amount === "number" &&
    typeof (msg as Record<string, unknown>).successful === "boolean" &&
    typeof (msg as Record<string, unknown>).timestamp === "string"
  );
}

export function isSubscriptionConfirm(
  msg: unknown,
): msg is WsSubscriptionConfirm {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Record<string, unknown>).type === "subscription_confirm"
  );
}

// Parse and validate WebSocket message
export function parseWebSocketMessage(
  data: unknown,
): WsMessage | WsUnknownMessage | null {
  if (typeof data !== "object" || data === null) {
    logger.warn("Received non-object WebSocket message:", data);
    return null;
  }

  const msg = data as Record<string, unknown>;
  const type = msg.type;

  if (typeof type !== "string") {
    logger.warn("WebSocket message missing or invalid type field:", msg);
    return null;
  }

  // Validate against known message types
  if (isSnapshotUpdate(data)) return data;
  if (isCorridorUpdate(data)) return data;
  if (isAnchorUpdate(data)) return data;
  if (isPing(data)) return data;
  if (isPong(data)) return data;
  if (isConnected(data)) return data;
  if (isError(data)) return data;
  if (isHealthAlert(data)) return data;
  if (isNewPayment(data)) return data;
  if (isSubscriptionConfirm(data)) return data;

  // Log unknown message types
  logger.warn("Received unknown WebSocket message type:", type, msg);
  return { type, ...msg } as WsUnknownMessage;
}

// Safe type extraction with fallback
export function extractTypedMessage<T extends WsMessage>(
  message: WsMessage | WsUnknownMessage | null,
  typeGuard: (msg: unknown) => msg is T,
  fallback: T,
): T {
  if (!message || !typeGuard(message)) {
    return fallback;
  }
  return message;
}
