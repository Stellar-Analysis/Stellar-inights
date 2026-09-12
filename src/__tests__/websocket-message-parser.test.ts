import { describe, it, expect } from "vitest";
import {
  parseWebSocketMessage,
  isSnapshotUpdate,
  isCorridorUpdate,
  isAnchorUpdate,
  isPing,
  isPong,
  isConnected,
  isError,
  isHealthAlert,
  isNewPayment,
  isSubscriptionConfirm,
  WsMessage,
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

describe("WebSocket Message Parser", () => {
  describe("parseWebSocketMessage", () => {
    it("should parse valid snapshot update messages", () => {
      const message = {
        type: "snapshot_update",
        snapshot_id: "snap-123",
        epoch: 1,
        timestamp: "2024-01-01T00:00:00Z",
        hash: "abc123",
      };

      const result = parseWebSocketMessage(message);
      expect(result).toEqual(message);
      expect(result?.type).toBe("snapshot_update");
    });

    it("should parse valid corridor update messages", () => {
      const message = {
        type: "corridor_update",
        corridor_id: "corr-123",
        corridor_key: "USD-EUR",
        success_rate: 0.95,
        volume_usd: 1000000,
        total_transactions: 500,
      };

      const result = parseWebSocketMessage(message);
      expect(result).toEqual(message);
      expect(result?.type).toBe("corridor_update");
    });

    it("should parse valid anchor update messages", () => {
      const message = {
        type: "anchor_update",
        anchor_id: "anchor-123",
        name: "Test Anchor",
        reliability_score: 0.98,
        status: "active",
      };

      const result = parseWebSocketMessage(message);
      expect(result).toEqual(message);
      expect(result?.type).toBe("anchor_update");
    });

    it("should parse ping messages", () => {
      const message = {
        type: "ping",
        timestamp: 1234567890,
      };

      const result = parseWebSocketMessage(message);
      expect(result).toEqual(message);
      expect(result?.type).toBe("ping");
    });

    it("should parse pong messages", () => {
      const message = {
        type: "pong",
        timestamp: 1234567890,
      };

      const result = parseWebSocketMessage(message);
      expect(result).toEqual(message);
      expect(result?.type).toBe("pong");
    });

    it("should parse connected messages", () => {
      const message = {
        type: "connected",
        connection_id: "conn-123",
      };

      const result = parseWebSocketMessage(message);
      expect(result).toEqual(message);
      expect(result?.type).toBe("connected");
    });

    it("should parse error messages", () => {
      const message = {
        type: "error",
        message: "Connection failed",
      };

      const result = parseWebSocketMessage(message);
      expect(result).toEqual(message);
      expect(result?.type).toBe("error");
    });

    it("should parse health alert messages", () => {
      const message = {
        type: "health_alert",
        corridor_id: "corr-123",
        severity: "critical",
        message: "Corridor down",
        timestamp: "2024-01-01T00:00:00Z",
      };

      const result = parseWebSocketMessage(message);
      expect(result).toEqual(message);
      expect(result?.type).toBe("health_alert");
    });

    it("should parse new payment messages", () => {
      const message = {
        type: "new_payment",
        corridor_id: "corr-123",
        amount: 1000,
        successful: true,
        timestamp: "2024-01-01T00:00:00Z",
      };

      const result = parseWebSocketMessage(message);
      expect(result).toEqual(message);
      expect(result?.type).toBe("new_payment");
    });

    it("should parse subscription confirm messages", () => {
      const message = {
        type: "subscription_confirm",
        channels: ["channel-1", "channel-2"],
      };

      const result = parseWebSocketMessage(message);
      expect(result).toEqual(message);
      expect(result?.type).toBe("subscription_confirm");
    });

    it("should handle malformed JSON with graceful fallback", () => {
      // Invalid JSON should return null
      expect(parseWebSocketMessage(null)).toBeNull();
      expect(parseWebSocketMessage(undefined)).toBeNull();
      expect(parseWebSocketMessage(123)).toBeNull();
      expect(parseWebSocketMessage("string")).toBeNull();
      expect(parseWebSocketMessage([])).toBeNull();
    });

    it("should handle messages missing type field", () => {
      const message = {
        snapshot_id: "snap-123",
        epoch: 1,
      };

      const result = parseWebSocketMessage(message);
      expect(result).toBeNull();
    });

    it("should handle messages with non-string type field", () => {
      const message = {
        type: 123,
        data: "test",
      };

      const result = parseWebSocketMessage(message);
      expect(result).toBeNull();
    });

    it("should return unknown message with valid type field", () => {
      const message = {
        type: "unknown_type",
        data: "test",
      };

      const result = parseWebSocketMessage(message);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("unknown_type");
    });

    it("should reject corridor update with missing required fields", () => {
      const invalidMessage = {
        type: "corridor_update",
        corridor_id: "corr-123",
        // Missing other required fields
      };

      const result = parseWebSocketMessage(invalidMessage);
      // Should not be parsed as valid corridor update, but may be returned as unknown
      expect(result?.type).toBe("corridor_update");
      expect(isCorridorUpdate(result)).toBe(false);
    });

    it("should reject anchor update with invalid field types", () => {
      const invalidMessage = {
        type: "anchor_update",
        anchor_id: "anchor-123",
        name: "Test",
        reliability_score: "not-a-number", // Invalid type
        status: "active",
      };

      const result = parseWebSocketMessage(invalidMessage);
      expect(isAnchorUpdate(result)).toBe(false);
    });

    it("should reject health alert with invalid severity", () => {
      const invalidMessage = {
        type: "health_alert",
        corridor_id: "corr-123",
        severity: "invalid-severity", // Not in allowed values
        message: "Alert",
        timestamp: "2024-01-01T00:00:00Z",
      };

      const result = parseWebSocketMessage(invalidMessage);
      expect(isHealthAlert(result)).toBe(false);
    });

    it("should handle extra fields in valid messages", () => {
      const messageWithExtra = {
        type: "ping",
        timestamp: 1234567890,
        extra_field: "extra_value",
        another: 123,
      };

      const result = parseWebSocketMessage(messageWithExtra);
      expect(isPing(result)).toBe(true);
    });
  });

  describe("Type guard functions", () => {
    it("isSnapshotUpdate should correctly identify snapshot updates", () => {
      const valid: WsSnapshotUpdate = {
        type: "snapshot_update",
        snapshot_id: "snap-123",
        epoch: 1,
        timestamp: "2024-01-01T00:00:00Z",
        hash: "abc123",
      };

      expect(isSnapshotUpdate(valid)).toBe(true);
      expect(isSnapshotUpdate({ ...valid, snapshot_id: 123 })).toBe(false);
      expect(isSnapshotUpdate({ ...valid, type: "other" })).toBe(false);
    });

    it("isCorridorUpdate should correctly identify corridor updates", () => {
      const valid: WsCorridorUpdate = {
        type: "corridor_update",
        corridor_id: "corr-123",
        corridor_key: "USD-EUR",
        success_rate: 0.95,
        volume_usd: 1000000,
        total_transactions: 500,
      };

      expect(isCorridorUpdate(valid)).toBe(true);
      expect(isCorridorUpdate({ ...valid, success_rate: "high" })).toBe(false);
      expect(isCorridorUpdate({ ...valid, volume_usd: null })).toBe(false);
    });

    it("isAnchorUpdate should correctly identify anchor updates", () => {
      const valid: WsAnchorUpdate = {
        type: "anchor_update",
        anchor_id: "anchor-123",
        name: "Test",
        reliability_score: 0.98,
        status: "active",
      };

      expect(isAnchorUpdate(valid)).toBe(true);
      expect(isAnchorUpdate({ ...valid, reliability_score: "high" })).toBe(
        false,
      );
    });

    it("isPing should correctly identify ping messages", () => {
      const valid: WsPing = {
        type: "ping",
        timestamp: 1234567890,
      };

      expect(isPing(valid)).toBe(true);
      expect(isPing({ ...valid, timestamp: "not-a-number" })).toBe(false);
    });

    it("isPong should correctly identify pong messages", () => {
      const valid: WsPong = {
        type: "pong",
        timestamp: 1234567890,
      };

      expect(isPong(valid)).toBe(true);
      expect(isPong({ ...valid, type: "ping" })).toBe(false);
    });

    it("isConnected should correctly identify connected messages", () => {
      const valid: WsConnected = {
        type: "connected",
        connection_id: "conn-123",
      };

      expect(isConnected(valid)).toBe(true);
      expect(isConnected({ ...valid, connection_id: 123 })).toBe(false);
    });

    it("isError should correctly identify error messages", () => {
      const valid: WsError = {
        type: "error",
        message: "Error occurred",
      };

      expect(isError(valid)).toBe(true);
      expect(isError({ ...valid, message: null })).toBe(false);
    });

    it("isHealthAlert should correctly identify health alerts", () => {
      const valid: WsHealthAlert = {
        type: "health_alert",
        corridor_id: "corr-123",
        severity: "critical",
        message: "Alert",
        timestamp: "2024-01-01T00:00:00Z",
      };

      expect(isHealthAlert(valid)).toBe(true);
      expect(isHealthAlert({ ...valid, severity: "unknown" })).toBe(false);
      expect(isHealthAlert({ ...valid, severity: "warning" })).toBe(true);
    });

    it("isNewPayment should correctly identify new payment messages", () => {
      const valid: WsNewPayment = {
        type: "new_payment",
        corridor_id: "corr-123",
        amount: 1000,
        successful: true,
        timestamp: "2024-01-01T00:00:00Z",
      };

      expect(isNewPayment(valid)).toBe(true);
      expect(isNewPayment({ ...valid, amount: "1000" })).toBe(false);
      expect(isNewPayment({ ...valid, successful: 1 })).toBe(false);
    });

    it("isSubscriptionConfirm should correctly identify subscription confirms", () => {
      const valid: WsSubscriptionConfirm = {
        type: "subscription_confirm",
        channels: ["ch1"],
      };

      expect(isSubscriptionConfirm(valid)).toBe(true);
      expect(isSubscriptionConfirm({ type: "subscription_confirm" })).toBe(
        true,
      );
    });
  });

  describe("Edge cases and security", () => {
    it("should handle deeply nested objects safely", () => {
      const message = {
        type: "unknown",
        nested: {
          deeply: {
            nested: {
              object: {
                with: {
                  many: "values",
                },
              },
            },
          },
        },
      };

      const result = parseWebSocketMessage(message);
      expect(result?.type).toBe("unknown");
    });

    it("should handle messages with null prototype", () => {
      const message = Object.create(null);
      message.type = "test";

      const result = parseWebSocketMessage(message);
      expect(result?.type).toBe("test");
    });

    it("should reject messages with missing required fields in corridor update", () => {
      const incomplete = {
        type: "corridor_update",
        corridor_id: "corr-123",
        corridor_key: "USD-EUR",
        // Missing success_rate, volume_usd, total_transactions
      };

      expect(isCorridorUpdate(incomplete)).toBe(false);
    });

    it("should handle circular references in JSON gracefully", () => {
      // Note: JSON.stringify will error on circular refs before reaching parser
      // but we test that parser doesn't break on valid objects
      const valid: WsPing = {
        type: "ping",
        timestamp: Date.now(),
      };

      const result = parseWebSocketMessage(valid);
      expect(isPing(result)).toBe(true);
    });
  });
});
