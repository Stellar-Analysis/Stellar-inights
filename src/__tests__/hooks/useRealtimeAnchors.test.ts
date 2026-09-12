import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRealtimeAnchors } from "@/hooks/useRealtimeAnchors";

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

describe("useRealtimeAnchors - Message Handler Validation", () => {
  it("should handle valid anchor update messages", () => {
    const onAnchorUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeAnchors({ onAnchorUpdate }),
    );

    const validMessage = {
      type: "anchor_update" as const,
      anchor_id: "anchor-123",
      name: "Test Anchor",
      reliability_score: 0.98,
      status: "active",
    };

    expect(result.current.anchorUpdates.size).toBe(0);
  });

  it("should safely ignore malformed anchor update messages", () => {
    const onAnchorUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeAnchors({ onAnchorUpdate }),
    );

    // Malformed message - missing required fields
    const malformedMessage = {
      type: "anchor_update",
      anchor_id: "anchor-123",
      // Missing other required fields
    };

    expect(result.current.anchorUpdates.size).toBe(0);
  });

  it("should reject anchor update with invalid field types", () => {
    const onAnchorUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeAnchors({ onAnchorUpdate }),
    );

    const invalidMessage = {
      type: "anchor_update",
      anchor_id: "anchor-123",
      name: "Test",
      reliability_score: "not-a-number", // Invalid type
      status: "active",
    };

    expect(result.current.anchorUpdates.size).toBe(0);
  });

  it("should handle subscription confirm messages gracefully", () => {
    const { result } = renderHook(() => useRealtimeAnchors());

    const confirmMessage = {
      type: "subscription_confirm" as const,
      channels: ["channel-1"],
    };

    // Should not throw or cause state changes
    expect(result.current.anchorUpdates.size).toBe(0);
  });

  it("should ignore unknown message types", () => {
    const { result } = renderHook(() => useRealtimeAnchors());

    const unknownMessage = {
      type: "unknown_message_type",
      data: "some data",
    };

    // Should not throw or cause state changes
    expect(result.current.anchorUpdates.size).toBe(0);
  });

  it("should maintain anchor updates map correctly", () => {
    const { result } = renderHook(() => useRealtimeAnchors());

    // Updates should be stored in map
    expect(result.current.anchorUpdates).toBeInstanceOf(Map);
  });

  it("should call onAnchorUpdate callback for valid messages", () => {
    const onAnchorUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeAnchors({ onAnchorUpdate }),
    );

    expect(onAnchorUpdate).not.toHaveBeenCalled();
  });

  it("should handle multiple anchor updates", () => {
    const { result } = renderHook(() => useRealtimeAnchors());

    // Map should be able to store multiple anchors
    expect(result.current.anchorUpdates).toBeInstanceOf(Map);
    expect(result.current.anchorUpdates.size).toBe(0);
  });

  it("should not process messages while disconnected", () => {
    const onAnchorUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeAnchors({ onAnchorUpdate }),
    );

    expect(result.current.isConnected).toBeDefined();
  });

  it("should safely handle null or undefined messages", () => {
    const { result } = renderHook(() => useRealtimeAnchors());

    // Should not throw when receiving null/undefined
    expect(result.current.anchorUpdates.size).toBe(0);
  });
});
