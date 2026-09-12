import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentVolumeChart } from "../PaymentVolumeChart";
import { fetchNetworkPaymentVolume } from "@/lib/network-api";

describe("PaymentVolumeChart", () => {
  it("shows empty state when series is missing", () => {
    render(<PaymentVolumeChart data={[]} />);
    expect(screen.getByText("Payment Volume")).toBeInTheDocument();
    expect(
      screen.getByText(/No payment-volume series yet/i),
    ).toBeInTheDocument();
  });

  it("renders summary stats from series data", () => {
    render(
      <PaymentVolumeChart
        data={[
          { date: "2026-07-01", volume: 100_000 },
          { date: "2026-07-02", volume: 250_000 },
          { date: "2026-07-03", volume: 150_000 },
        ]}
      />,
    );

    expect(screen.getByText("Latest day")).toBeInTheDocument();
    expect(screen.getByText("Period total")).toBeInTheDocument();
    // peak 250000 → compact currency (e.g. $250.0K)
    expect(screen.getByText(/\$250(\.0)?K/)).toBeInTheDocument();
  });
});

describe("fetchNetworkPaymentVolume", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty series on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );
    const result = await fetchNetworkPaymentVolume();
    expect(result.points).toEqual([]);
    expect(result.unit).toBe("usd");
  });

  it("normalizes a bare {date,volume} array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => [
            { date: "2026-07-02", volume: 20 },
            { date: "2026-07-01", volume: 10 },
          ],
        }),
      ),
    );

    const result = await fetchNetworkPaymentVolume(7);
    expect(result.points).toEqual([
      { date: "2026-07-01", volume: 10 },
      { date: "2026-07-02", volume: 20 },
    ]);
  });
});
