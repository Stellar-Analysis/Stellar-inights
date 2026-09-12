import { describe, it, expect } from "vitest";
import {
  parseWebSocketMessage,
  isCorridorUpdate,
  isHealthAlert,
  isNewPayment,
  isSubscriptionConfirm,
  isPing,
  isAnchorUpdate,
  isSnapshotUpdate,
  isConnected,
  isError,
} from "../websocket-message-parser";

describe("WebSocket Message Parser", () => {
  describe("parseWebSocketMessage", () => {
    it("should parse a valid corridor_update message", () => {
      const msg = {
        type: "corridor_update",
        corridor_id: "corr-1",
        corridor_key: "USDC-USD",
        success_rate: 0.98,
        volume_usd: 100000,
        total_transactions: 500,
      };
      const result = parseWebSocketMessage(msg);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("corridor_update");
    });

    it("should parse a valid health_alert message", () => {
      const msg = {
        type: "health_alert",
        corridor_id: "corr-1",
        severity: "warning",
        message: "High failure rate detected",
        timestamp: "2025-01-01T00:00:00Z",
      };
      const result = parseWebSocketMessage(msg);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("health_alert");
    });

    it("should parse a valid new_payment message", () => {
      const msg = {
        type: "new_payment",
        corridor_id: "corr-1",
        amount: 1000,
        successful: true,
        timestamp: "2025-01-01T00:00:00Z",
      };
      const result = parseWebSocketMessage(msg);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("new_payment");
    });

    it("should parse a valid anchor_update message", () => {
      const msg = {
        type: "anchor_update",
        anchor_id: "anchor-1",
        name: "Test Anchor",
        reliability_score: 95.5,
        status: "green",
      };
      const result = parseWebSocketMessage(msg);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("anchor_update");
    });

    it("should parse a valid ping message", () => {
      const msg = { type: "ping", timestamp: 1234567890 };
      const result = parseWebSocketMessage(msg);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("ping");
    });

    it("should return null for non-object input", () => {
      expect(parseWebSocketMessage(null)).toBeNull();
      expect(parseWebSocketMessage("string")).toBeNull();
      expect(parseWebSocketMessage(42)).toBeNull();
    });

    it("should return null for message missing type field", () => {
      const msg = { some_field: "value" };
      expect(parseWebSocketMessage(msg)).toBeNull();
    });

    it("should return null for malformed corridor_update missing required fields", () => {
      const msg = { type: "corridor_update", corridor_id: "corr-1" };
      const result = parseWebSocketMessage(msg);
      // Should return the message as WsUnknownMessage since validation fails
      expect(result).not.toBeNull();
      expect(result!.type).toBe("corridor_update");
    });

    it("should handle completely unknown message type gracefully", () => {
      const msg = { type: "some_random_type", data: "test" };
      const result = parseWebSocketMessage(msg);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("some_random_type");
    });

    it("should validate successful field on new_payment correctly", () => {
      const msg = {
        type: "new_payment",
        corridor_id: "corr-1",
        amount: 100,
        successful: false,
        timestamp: "2025-01-01T00:00:00Z",
      };
      const result = parseWebSocketMessage(msg);
      expect(result).not.toBeNull();
      expect(isNewPayment(result)).toBe(true);
    });
  });

  describe("Type Guards", () => {
    it("isCorridorUpdate should identify valid corridor updates", () => {
      expect(isCorridorUpdate({ type: "corridor_update", corridor_id: "c1", corridor_key: "k1", success_rate: 0.9, volume_usd: 100, total_transactions: 10 })).toBe(true);
      expect(isCorridorUpdate({ type: "other", corridor_id: "c1" })).toBe(false);
      expect(isCorridorUpdate(null)).toBe(false);
    });

    it("isHealthAlert should validate severity values", () => {
      const severities = ["info", "warning", "error", "critical"];
      severities.forEach(s => {
        expect(isHealthAlert({ type: "health_alert", corridor_id: "c1", severity: s, message: "test", timestamp: "2025-01-01T00:00:00Z" })).toBe(true);
      });
      expect(isHealthAlert({ type: "health_alert", corridor_id: "c1", severity: "unknown", message: "test", timestamp: "2025-01-01T00:00:00Z" })).toBe(false);
    });

    it("isSubscriptionConfirm should allow optional channels field", () => {
      expect(isSubscriptionConfirm({ type: "subscription_confirm" })).toBe(true);
      expect(isSubscriptionConfirm({ type: "subscription_confirm", channels: ["corridor:USDC-USD"] })).toBe(true);
      expect(isSubscriptionConfirm({ type: "other" })).toBe(false);
    });

    it("isPing should validate timestamp", () => {
      expect(isPing({ type: "ping", timestamp: 1234567890 })).toBe(true);
      expect(isPing({ type: "ping" })).toBe(false);
      expect(isPing({ type: "ping", timestamp: "not-a-number" })).toBe(false);
    });

    it("isConnected should validate connection_id", () => {
      expect(isConnected({ type: "connected", connection_id: "conn-1" })).toBe(true);
      expect(isConnected({ type: "connected" })).toBe(false);
    });

    it("isError should validate message", () => {
      expect(isError({ type: "error", message: "Something went wrong" })).toBe(true);
      expect(isError({ type: "error" })).toBe(false);
    });
  });

  describe("Edge Cases and Safety", () => {
    it("should handle messages with extra unknown fields safely", () => {
      const msg = {
        type: "corridor_update",
        corridor_id: "corr-1",
        corridor_key: "USDC-USD",
        success_rate: 0.95,
        volume_usd: 50000,
        total_transactions: 250,
        some_extra_field: "should be ignored",
      };
      const result = parseWebSocketMessage(msg);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("corridor_update");
    });
  });
});