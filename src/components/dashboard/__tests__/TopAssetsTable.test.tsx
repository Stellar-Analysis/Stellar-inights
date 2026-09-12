import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopAssetsTable } from "../TopAssetsTable";

describe("TopAssetsTable", () => {
  beforeEach(() => {
    // Mock window.open
    Object.defineProperty(window, 'open', {
      writable: true,
      value: vi.fn(),
    });
  });

  const mockAssets = [
    {
      symbol: "XLM",
      name: "Stellar",
      volume24h: 1500000,
      price: 0.15,
      change24h: 5.2,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      volume24h: 2500000,
      price: 1.0,
      change24h: -2.3,
    },
    {
      symbol: "BTC",
      name: "Bitcoin",
      volume24h: 500000,
      price: 45000.50,
      change24h: 0.8,
    },
  ];

  it("should render Top Movers header", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    expect(screen.getByText("Asset Liquidity // Top Movers")).toBeTruthy();
  });

  it("should render LATEST_SNAPSHOT badge", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    expect(screen.getByText("LATEST_SNAPSHOT")).toBeTruthy();
  });

  it("should render table headers", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    expect(screen.getByText("Asset Pair")).toBeTruthy();
    expect(screen.getByText("Price")).toBeTruthy();
    expect(screen.getByText("Change")).toBeTruthy();
    expect(screen.getByText("Volume (24h)")).toBeTruthy();
    expect(screen.getByText("Share")).toBeTruthy();
  });

  it("should render asset data correctly", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    
    expect(screen.getByText("XLM")).toBeTruthy();
    expect(screen.getByText("Stellar")).toBeTruthy();
    expect(screen.getByText("USDC")).toBeTruthy();
    expect(screen.getByText("USD Coin")).toBeTruthy();
    expect(screen.getByText("BTC")).toBeTruthy();
    expect(screen.getByText("Bitcoin")).toBeTruthy();
  });

  it("should render positive change in green", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    const xlmRow = screen.getByText("XLM").closest("tr");
    const changeCell = xlmRow?.querySelector("td:nth-child(3)");
    expect(changeCell?.className).toContain("text-green-400");
    expect(screen.getByText("+5.2%")).toBeTruthy();
  });

  it("should render negative change in red", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    const usdcRow = screen.getByText("USDC").closest("tr");
    const changeCell = usdcRow?.querySelector("td:nth-child(3)");
    expect(changeCell?.className).toContain("text-red-400");
    expect(screen.getByText("-2.3%")).toBeTruthy();
  });

  it("should format price correctly for assets under $1", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    expect(screen.getByText("$0.1500")).toBeTruthy();
  });

  it("should format price correctly for assets over $1", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    expect(screen.getByText("$45,000.50")).toBeTruthy();
  });

  it("should format volume in compact notation", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    expect(screen.getByText(/1\.5M/)).toBeTruthy();
    expect(screen.getByText(/2\.5M/)).toBeTruthy();
    expect(screen.getByText(/500K/)).toBeTruthy();
  });

  it("should render asset symbol initials in icon", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    expect(screen.getByText("XL")).toBeTruthy();
    expect(screen.getByText("US")).toBeTruthy();
    expect(screen.getByText("BT")).toBeTruthy();
  });

  it("should render empty state when no assets provided", () => {
    render(<TopAssetsTable assets={[]} />);
    expect(screen.getByText("Asset Liquidity // Top Movers")).toBeTruthy();
    expect(screen.getByText("LATEST_SNAPSHOT")).toBeTruthy();
    
    // Table should be present but with no rows
    const tableRows = screen.queryAllByRole("row");
    expect(tableRows.length).toBe(1); // Only header row
  });

  it("should render all table columns for each asset", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    
    const tableRows = screen.queryAllByRole("row");
    // Header row + 3 asset rows
    expect(tableRows.length).toBe(4);
  });

  it("should handle zero change correctly", () => {
    const assetsWithZeroChange = [
      {
        symbol: "ETH",
        name: "Ethereum",
        volume24h: 1000000,
        price: 3000.0,
        change24h: 0,
      },
    ];
    render(<TopAssetsTable assets={assetsWithZeroChange} />);
    const ethRow = screen.getByText("ETH").closest("tr");
    const changeCell = ethRow?.querySelector("td:nth-child(3)");
    expect(changeCell?.className).toContain("text-green-400");
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("should handle very large volumes", () => {
    const assetsWithLargeVolume = [
      {
        symbol: "XLM",
        name: "Stellar",
        volume24h: 15000000000,
        price: 0.15,
        change24h: 5.2,
      },
    ];
    render(<TopAssetsTable assets={assetsWithLargeVolume} />);
    expect(screen.getByText(/15B/)).toBeTruthy();
  });

  it("should handle very small volumes", () => {
    const assetsWithSmallVolume = [
      {
        symbol: "XLM",
        name: "Stellar",
        volume24h: 500,
        price: 0.15,
        change24h: 5.2,
      },
    ];
    render(<TopAssetsTable assets={assetsWithSmallVolume} />);
    // Anchored regex: unanchored /500/ also matches the $0.1500 price cell.
    expect(screen.getByText(/^\$500$/)).toBeTruthy();
  });

  it("should render share button in each row", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    const shareButtons = screen.getAllByLabelText(/Share.*on X\/Twitter/i);
    expect(shareButtons.length).toBe(mockAssets.length);
  });

  it("should open Twitter intent URL when share button is clicked", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    const xlmShareButton = screen.getByLabelText(/Share XLM on X\/Twitter/i);
    fireEvent.click(xlmShareButton);
    
    expect(window.open).toHaveBeenCalledTimes(1);
    const callArgs = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    const shareUrl = decodeURIComponent(callArgs[0] as string);
    expect(shareUrl).toContain('twitter.com/intent/tweet');
    expect(shareUrl).toContain('XLM');
    expect(shareUrl).toContain('Stellar');
    expect(shareUrl).toContain('0.1500');
    expect(shareUrl).toContain('+5.2%');
    expect(callArgs[1]).toBe('_blank');
  });

  it("should format share text correctly for asset over $1", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    const btcShareButton = screen.getByLabelText(/Share BTC on X\/Twitter/i);
    fireEvent.click(btcShareButton);

    const callArgs = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    const shareUrl = decodeURIComponent(callArgs[0] as string);
    expect(shareUrl).toContain('BTC');
    expect(shareUrl).toContain('Bitcoin');
    expect(shareUrl).toContain('45,000.50');
    expect(shareUrl).toContain('+0.8%');
  });

  it("should format share text correctly for negative change", () => {
    render(<TopAssetsTable assets={mockAssets} />);
    const usdcShareButton = screen.getByLabelText(/Share USDC on X\/Twitter/i);
    fireEvent.click(usdcShareButton);

    const callArgs = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    const shareUrl = decodeURIComponent(callArgs[0] as string);
    expect(shareUrl).toContain('USDC');
    expect(shareUrl).toContain('USD Coin');
    expect(shareUrl).toContain('-2.3%');
  });

  describe("New Holders column", () => {
    it("should render the New Holders header", () => {
      render(<TopAssetsTable assets={mockAssets} />);
      expect(screen.getByText("New Holders")).toBeTruthy();
    });

    it("should render a dash when newHolders24h is not provided", () => {
      render(<TopAssetsTable assets={mockAssets} />);
      const xlmRow = screen.getByText("XLM").closest("tr");
      const holdersCell = xlmRow?.querySelector("td:nth-child(4)");
      expect(holdersCell?.textContent).toBe("—");
    });

    it("should render new-holder counts with a leading + and thousands separators", () => {
      const assetsWithHolders = [
        { symbol: "AQUA", name: "Aquarius", volume24h: 4_120_000, price: 0.00234, change24h: 18.4, newHolders24h: 12_341 },
      ];
      render(<TopAssetsTable assets={assetsWithHolders} />);
      expect(screen.getByText("+12,341")).toBeTruthy();
    });
  });

  describe("no 24h-ago baseline (null change)", () => {
    const newAsset = [
      { symbol: "NEWX", name: "New Asset", volume24h: 12_800, price: 0.0041, change24h: null, newHolders24h: 87 },
    ];

    it("should render a neutral dash instead of a red/green percentage", () => {
      render(<TopAssetsTable assets={newAsset} />);
      const row = screen.getByText("NEWX").closest("tr");
      const changeCell = row?.querySelector("td:nth-child(3)");
      expect(changeCell?.textContent).toBe("—");
      expect(changeCell?.className).not.toContain("text-red-400");
      expect(changeCell?.className).not.toContain("text-green-400");
    });

    it("should share 'N/A' instead of a bogus percentage", () => {
      render(<TopAssetsTable assets={newAsset} />);
      fireEvent.click(screen.getByLabelText(/Share NEWX on X\/Twitter/i));

      const callArgs = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
      const shareUrl = decodeURIComponent(callArgs[0] as string);
      expect(shareUrl).toContain("24h Change: N/A");
    });
  });
});
