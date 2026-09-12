import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RealtimeDashboardFallback } from "../RealtimeDashboardFallback";

describe("RealtimeDashboardFallback", () => {
  const defaultProps = {
    isConnected: true,
    isConnecting: false,
    isStaleData: false,
    connectionAttempts: 0,
    lastUpdated: null,
    onRetry: vi.fn(),
    children: <div data-testid="child-content">Dashboard Content</div>,
  };

  it("should render children when connected", () => {
    render(<RealtimeDashboardFallback {...defaultProps} />);
    expect(screen.getByTestId("child-content")).toBeTruthy();
  });

  it("should show connecting indicator when isConnecting is true", () => {
    render(
      <RealtimeDashboardFallback
        {...defaultProps}
        isConnected={false}
        isConnecting={true}
      />,
    );
    expect(screen.getByText("Reconnecting...")).toBeTruthy();
  });

  it("should show disconnected state with retry button", () => {
    render(
      <RealtimeDashboardFallback
        {...defaultProps}
        isConnected={false}
        isConnecting={false}
      />,
    );
    expect(screen.getByText("Disconnected")).toBeTruthy();
    expect(screen.getByLabelText("Retry connection")).toBeTruthy();
  });

  it("should call onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();
    render(
      <RealtimeDashboardFallback
        {...defaultProps}
        isConnected={false}
        isConnecting={false}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByLabelText("Retry connection"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("should show stale data indicator when isStaleData is true", () => {
    render(
      <RealtimeDashboardFallback
        {...defaultProps}
        isConnected={true}
        isStaleData={true}
      />,
    );
    expect(screen.getByText("Data may be stale")).toBeTruthy();
  });

  it("should display connection attempt count", () => {
    render(
      <RealtimeDashboardFallback
        {...defaultProps}
        isConnected={false}
        isConnecting={true}
        connectionAttempts={3}
      />,
    );
    expect(screen.getByText(/Attempt 3/)).toBeTruthy();
  });

  it("should show full overlay after multiple failed connection attempts", () => {
    render(
      <RealtimeDashboardFallback
        {...defaultProps}
        isConnected={false}
        isConnecting={false}
        connectionAttempts={5}
      />,
    );
    expect(screen.getByText("Connection Lost")).toBeTruthy();
    expect(screen.getByLabelText("Try reconnecting")).toBeTruthy();
  });

  it("should preserve children opacity when disconnected", () => {
    render(
      <RealtimeDashboardFallback
        {...defaultProps}
        isConnected={false}
        isConnecting={false}
      />,
    );
    const childContainer = screen.getByTestId("child-content").parentElement;
    expect(childContainer?.className).toContain("opacity-50");
  });

  it("should show last updated time when stale", () => {
    const lastUpdated = new Date("2025-01-01T12:00:00Z");
    render(
      <RealtimeDashboardFallback
        {...defaultProps}
        isConnected={true}
        isStaleData={true}
        lastUpdated={lastUpdated}
      />,
    );
    expect(screen.getByText(/12:00:00/)).toBeTruthy();
  });
});
