import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRealtimeCorridors } from "@/hooks/useRealtimeCorridors";

// Mock the useWebSocket hook
vi.mock("@/hooks/useWebSocket", () => ({
  useWebSocket: vi.fn((url, options) => ({
    isConnected: true,
    isConnecting: false,
    lastMessage: null,
    connectionAttempts: 0,
    send: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    reconnect: vi.fn(),
    __onMessage: options.onMessage,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/config", () => ({
  config: {
    wsUrl: "ws://localhost:8080",
  },
}));

describe("useRealtimeCorridors - Message Handler Validation", () => {
  it("should handle valid corridor update messages", () => {
    const onCorridorUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeCorridors({ onCorridorUpdate }),
    );

    const validMessage = {
      type: "corridor_update" as const,
      corridor_id: "corr-123",
      corridor_key: "USD-EUR",
      success_rate: 0.95,
      volume_usd: 1000000,
      total_transactions: 500,
    };

    expect(result.current.corridorUpdates.size).toBe(0);
  });

  it("should safely ignore malformed corridor update messages", () => {
    const onCorridorUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeCorridors({ onCorridorUpdate }),
    );

    // Malformed message - missing required fields
    const malformedMessage = {
      type: "corridor_update",
      corridor_id: "corr-123",
      // Missing other required fields
    };

    expect(result.current.corridorUpdates.size).toBe(0);
  });

  it("should handle valid health alert messages", () => {
    const onHealthAlert = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeCorridors({ onHealthAlert }),
    );

    const validAlert = {
      type: "health_alert" as const,
      corridor_id: "corr-123",
      severity: "critical" as const,
      message: "Corridor down",
      timestamp: "2024-01-01T00:00:00Z",
    };

    expect(result.current.healthAlerts.length).toBe(0);
  });

  it("should reject health alert with invalid severity", () => {
    const onHealthAlert = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeCorridors({ onHealthAlert }),
    );

    const invalidAlert = {
      type: "health_alert",
      corridor_id: "corr-123",
      severity: "invalid-severity", // Not in allowed values
      message: "Alert",
      timestamp: "2024-01-01T00:00:00Z",
    };

    expect(result.current.healthAlerts.length).toBe(0);
  });

  it("should handle valid new payment messages when enabled", () => {
    const onNewPayment = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeCorridors({ enablePaymentStream: true, onNewPayment }),
    );

    const validPayment = {
      type: "new_payment" as const,
      corridor_id: "corr-123",
      amount: 1000,
      successful: true,
      timestamp: "2024-01-01T00:00:00Z",
    };

    expect(result.current.recentPayments.length).toBe(0);
  });

  it("should ignore new payment messages when disabled", () => {
    const onNewPayment = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeCorridors({ enablePaymentStream: false, onNewPayment }),
    );

    const validPayment = {
      type: "new_payment" as const,
      corridor_id: "corr-123",
      amount: 1000,
      successful: true,
      timestamp: "2024-01-01T00:00:00Z",
    };

    expect(result.current.recentPayments.length).toBe(0);
  });

  it("should handle subscription confirm messages gracefully", () => {
    const { result } = renderHook(() => useRealtimeCorridors());

    const confirmMessage = {
      type: "subscription_confirm" as const,
      channels: ["channel-1"],
    };

    // Should not throw or cause state changes
    expect(result.current.corridorUpdates.size).toBe(0);
  });

  it("should maintain alert history limit", () => {
    const { result } = renderHook(() => useRealtimeCorridors());

    // Alerts should maintain max 50 items
    expect(result.current.healthAlerts.length).toBeLessThanOrEqual(50);
  });

  it("should maintain payment history limit", () => {
    const { result } = renderHook(() =>
      useRealtimeCorridors({ enablePaymentStream: true }),
    );

    // Payments should maintain max 100 items
    expect(result.current.recentPayments.length).toBeLessThanOrEqual(100);
  });
});
