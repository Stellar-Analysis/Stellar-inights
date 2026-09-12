import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityCalendarHeatmap } from "../ActivityCalendarHeatmap";
import { ActivityDay } from "@/lib/analytics-api";

const ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW";

function daysAgo(n: number): string {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  today.setUTCDate(today.getUTCDate() - n);
  return today.toISOString().slice(0, 10);
}

describe("ActivityCalendarHeatmap", () => {
  it("renders the header and address", () => {
    render(<ActivityCalendarHeatmap data={[]} address={ADDRESS} />);
    expect(screen.getByText("Activity Calendar")).toBeTruthy();
    expect(
      screen.getByText(`${ADDRESS.slice(0, 8)}...${ADDRESS.slice(-8)}`),
    ).toBeTruthy();
  });

  it("renders an empty state when there is no activity", () => {
    render(<ActivityCalendarHeatmap data={[]} address={ADDRESS} />);
    expect(
      screen.getByText("No activity recorded for this address yet."),
    ).toBeTruthy();
  });

  it("sums total transactions across days", () => {
    const data: ActivityDay[] = [
      { date: daysAgo(2), count: 3 },
      { date: daysAgo(1), count: 5 },
      { date: daysAgo(0), count: 2 },
    ];
    render(<ActivityCalendarHeatmap data={data} address={ADDRESS} />);
    expect(screen.getByText("10")).toBeTruthy(); // total transactions
    expect(screen.getByText("3")).toBeTruthy(); // active days
  });

  it("computes the current streak ending today", () => {
    const data: ActivityDay[] = [
      { date: daysAgo(2), count: 1 },
      { date: daysAgo(1), count: 1 },
      { date: daysAgo(0), count: 1 },
    ];
    render(<ActivityCalendarHeatmap data={data} address={ADDRESS} />);
    expect(screen.getByText("3d")).toBeTruthy();
  });

  it("resets the streak to zero when today has no activity", () => {
    const data: ActivityDay[] = [{ date: daysAgo(3), count: 4 }];
    render(<ActivityCalendarHeatmap data={data} address={ADDRESS} />);
    expect(screen.getByText("0d")).toBeTruthy();
  });

  it("renders a whole number of full weeks covering the requested range", () => {
    const data: ActivityDay[] = [{ date: daysAgo(6), count: 1 }];
    render(<ActivityCalendarHeatmap data={data} address={ADDRESS} />);
    // Grid is padded to full weeks (preceding Sunday through the following
    // Saturday), so it's always a multiple of 7 and at least covers the range.
    const cells = screen.getAllByRole("gridcell");
    expect(cells.length % 7).toBe(0);
    expect(cells.length).toBeGreaterThanOrEqual(7);
  });
});
