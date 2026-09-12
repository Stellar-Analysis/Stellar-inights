import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopAssetsCard } from "../TopAssetsCard";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

describe("TopAssetsCard — default mode", () => {
  const defaultAssets = [
    { asset: "XLM", volume: 1_500_000, tvl: 2_000_000 },
    { asset: "USDC", volume: 2_500_000, tvl: 3_000_000 },
  ];

  it("renders the default heading and Volume/TVL columns", () => {
    render(<TopAssetsCard assets={defaultAssets} />);

    expect(screen.getByText("Top-performing Assets")).toBeTruthy();
    expect(screen.getByText("Volume")).toBeTruthy();
    expect(screen.getByText("TVL")).toBeTruthy();
    expect(screen.queryByText("New Holders")).toBeNull();
  });

  it("renders asset rows", () => {
    render(<TopAssetsCard assets={defaultAssets} />);
    expect(screen.getByText("XLM")).toBeTruthy();
    expect(screen.getByText("USDC")).toBeTruthy();
  });

  it("renders an empty state when there are no assets", () => {
    render(<TopAssetsCard assets={[]} />);
    expect(screen.getByText("No assets found.")).toBeTruthy();
  });
});

describe("TopAssetsCard — top-movers mode", () => {
  const moverAssets = [
    {
      asset: "AQUA",
      volume: 4_120_000,
      tvl: 4_120_000,
      price: 0.00234,
      change: 18.4,
      newHolders24h: 12_341,
    },
    {
      asset: "XLM",
      volume: 182_500_000,
      tvl: 182_500_000,
      price: 0.1287,
      change: -3.2,
      newHolders24h: 3_954,
    },
    {
      // No 24h-ago baseline yet (backend#38 edge case).
      asset: "NEWX",
      volume: 12_800,
      tvl: 12_800,
      price: 0.0041,
      change: null,
      newHolders24h: 87,
    },
  ];

  it("renders the Top Movers heading and price/24h/new-holders/volume columns", () => {
    render(<TopAssetsCard assets={moverAssets} mode="top-movers" />);

    expect(screen.getByText("Top Movers (24h)")).toBeTruthy();
    expect(screen.getByText("Price")).toBeTruthy();
    expect(screen.getByText("24h")).toBeTruthy();
    expect(screen.getByText("New Holders")).toBeTruthy();
    expect(screen.getByText("Volume")).toBeTruthy();
  });

  it("honors a custom title", () => {
    render(<TopAssetsCard assets={moverAssets} mode="top-movers" title="Custom Heading" />);
    expect(screen.getByText("Custom Heading")).toBeTruthy();
    expect(screen.queryByText("Top Movers (24h)")).toBeNull();
  });

  it("renders positive % change in green with a leading +", () => {
    render(<TopAssetsCard assets={moverAssets} mode="top-movers" />);
    const row = screen.getByText("AQUA").closest("tr");
    const changeCell = row?.querySelectorAll("td")[2];
    expect(changeCell?.textContent).toBe("+18.4%");
    expect(changeCell?.className).toContain("text-green-400");
  });

  it("renders negative % change in red without a leading +", () => {
    render(<TopAssetsCard assets={moverAssets} mode="top-movers" />);
    const row = screen.getByText("XLM").closest("tr");
    const changeCell = row?.querySelectorAll("td")[2];
    expect(changeCell?.textContent).toBe("-3.2%");
    expect(changeCell?.className).toContain("text-red-400");
  });

  it("renders a neutral dash — not red — for an asset with no 24h-ago baseline", () => {
    render(<TopAssetsCard assets={moverAssets} mode="top-movers" />);
    const row = screen.getByText("NEWX").closest("tr");
    const changeCell = row?.querySelectorAll("td")[2];
    expect(changeCell?.textContent).toBe("—");
    expect(changeCell?.className).not.toContain("text-red-400");
    expect(changeCell?.className).not.toContain("text-green-400");
  });

  it("renders the new-holders count with a leading + and thousands separators", () => {
    render(<TopAssetsCard assets={moverAssets} mode="top-movers" />);
    expect(screen.getByText("+12,341")).toBeTruthy();
    expect(screen.getByText("+3,954")).toBeTruthy();
    expect(screen.getByText("+87")).toBeTruthy();
  });

  it("treats an exact 0% change as positive (green), not negative", () => {
    render(
      <TopAssetsCard
        assets={[{ asset: "USDC", volume: 100, tvl: 100, price: 1, change: 0, newHolders24h: 5 }]}
        mode="top-movers"
      />,
    );
    const row = screen.getByText("USDC").closest("tr");
    const changeCell = row?.querySelectorAll("td")[2];
    expect(changeCell?.textContent).toBe("+0.0%");
    expect(changeCell?.className).toContain("text-green-400");
  });

  it("renders a dash for price and new-holders when omitted", () => {
    render(
      <TopAssetsCard
        assets={[{ asset: "XYZ", volume: 100, tvl: 100 }]}
        mode="top-movers"
      />,
    );
    const row = screen.getByText("XYZ").closest("tr");
    const cells = row?.querySelectorAll("td");
    expect(cells?.[1].textContent).toBe("—"); // price
    expect(cells?.[3].textContent).toBe("—"); // new holders
  });
});
