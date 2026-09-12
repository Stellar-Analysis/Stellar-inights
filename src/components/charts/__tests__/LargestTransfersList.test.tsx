import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LargestTransfersList } from "../LargestTransfersList";
import { LargestTransfer } from "@/lib/analytics-api";

const ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW";

const mockTransfers: LargestTransfer[] = [
  {
    id: "1",
    transaction_hash: "hash1",
    counterparty: "GCOUNTERPARTY1EXAMPLE0000000000000000000000000000000AAA",
    direction: "out",
    amount: 25000,
    asset_code: "XLM",
    amount_usd: 3125.5,
    timestamp: "2026-07-01T12:00:00Z",
  },
  {
    id: "2",
    transaction_hash: "hash2",
    counterparty: "GCOUNTERPARTY2EXAMPLE0000000000000000000000000000000BBB",
    direction: "in",
    amount: 500,
    asset_code: "USDC",
    asset_issuer: "GISSUER",
    amount_usd: 500,
    timestamp: "2026-06-15T08:30:00Z",
  },
];

describe("LargestTransfersList", () => {
  it("renders the header and address", () => {
    render(<LargestTransfersList transfers={mockTransfers} address={ADDRESS} />);
    expect(screen.getByText("Largest Transfers")).toBeTruthy();
    expect(
      screen.getByText(`${ADDRESS.slice(0, 8)}...${ADDRESS.slice(-8)}`),
    ).toBeTruthy();
  });

  it("renders an empty state when there are no transfers", () => {
    render(<LargestTransfersList transfers={[]} address={ADDRESS} />);
    expect(
      screen.getByText("No transfers recorded for this address yet."),
    ).toBeTruthy();
  });

  it("labels outgoing transfers as Sent and incoming as Received", () => {
    render(<LargestTransfersList transfers={mockTransfers} address={ADDRESS} />);
    expect(screen.getByText("Sent")).toBeTruthy();
    expect(screen.getByText("Received")).toBeTruthy();
  });

  it("renders truncated counterparty addresses", () => {
    render(<LargestTransfersList transfers={mockTransfers} address={ADDRESS} />);
    expect(screen.getByText("GCOUNT...000AAA")).toBeTruthy();
    expect(screen.getByText("GCOUNT...000BBB")).toBeTruthy();
  });

  it("renders the asset code next to the raw amount", () => {
    render(<LargestTransfersList transfers={mockTransfers} address={ADDRESS} />);
    expect(screen.getByText("XLM")).toBeTruthy();
    expect(screen.getByText("USDC")).toBeTruthy();
  });

  it("formats the USD value as compact currency", () => {
    render(<LargestTransfersList transfers={mockTransfers} address={ADDRESS} />);
    expect(screen.getByText("$3.13K")).toBeTruthy();
    expect(screen.getByText("$500")).toBeTruthy();
  });

  it("renders one row per transfer", () => {
    render(<LargestTransfersList transfers={mockTransfers} address={ADDRESS} />);
    const rows = screen.getAllByRole("row");
    // Header row + 2 transfer rows
    expect(rows.length).toBe(3);
  });
});
