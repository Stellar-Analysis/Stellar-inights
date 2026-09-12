import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AnchorTable from "../AnchorsTables";

// Mock the router
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
}));

const mockAnchors = [
  {
    id: "1",
    name: "Test Anchor Alpha",
    stellar_account: "GCKFBEIYTKP5ROORWS2HE6XXVV6MQVE6YDJHB5P7C4GGQXJN6ZHGKF3R",
    reliability_score: 97.5,
    asset_coverage: 10,
    failure_rate: 2.5,
    total_transactions: 10000,
    successful_transactions: 9750,
    failed_transactions: 250,
    status: "green",
  },
  {
    id: "2",
    name: "Test Anchor Beta",
    stellar_account: "GBVZDKFRF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3Q",
    reliability_score: 88.0,
    asset_coverage: 5,
    failure_rate: 12.0,
    total_transactions: 5000,
    successful_transactions: 4400,
    failed_transactions: 600,
    status: "yellow",
  },
  {
    id: "3",
    name: "Test Anchor Gamma",
    stellar_account: "GCK3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QY",
    reliability_score: 72.3,
    asset_coverage: 3,
    failure_rate: 27.7,
    total_transactions: 2000,
    successful_transactions: 1446,
    failed_transactions: 554,
    status: "red",
  },
  {
    id: "4",
    name: "Test Anchor Unknown",
    stellar_account: "GCK3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QYF6XU3QZ",
    reliability_score: 85.0,
    asset_coverage: 8,
    failure_rate: 15.0,
    total_transactions: 3000,
    successful_transactions: 2550,
    failed_transactions: 450,
    status: "unknown_status",
  },
];

describe("AnchorTable", () => {
  it("should render loading state when loading is true", () => {
    const { container } = render(<AnchorTable anchors={[]} loading={true} />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("should render empty state when no anchors provided", () => {
    render(<AnchorTable anchors={[]} />);
    expect(screen.getByText("No anchors available")).toBeTruthy();
  });

  it("should render anchor names in the table", () => {
    render(<AnchorTable anchors={mockAnchors} />);
    expect(screen.getByText("Test Anchor Alpha")).toBeTruthy();
    expect(screen.getByText("Test Anchor Beta")).toBeTruthy();
    expect(screen.getByText("Test Anchor Gamma")).toBeTruthy();
  });

  it("should render health indicators with correct status mapping", () => {
    const { container } = render(<AnchorTable anchors={mockAnchors} />);

    // Check for health status badges - the text comes from mapBackendStatus
    expect(screen.getByText("Healthy")).toBeTruthy();
    expect(screen.getByText("Warning")).toBeTruthy();
    expect(screen.getByText("Critical")).toBeTruthy();
  });

  it("should handle unknown health status values safely", () => {
    render(<AnchorTable anchors={mockAnchors} />);

    // unknown_status should map to "unknown_status" (passthrough)
    expect(screen.getByText("unknown_status")).toBeTruthy();
  });

  it("should render reliability scores", () => {
    render(<AnchorTable anchors={mockAnchors} />);
    expect(screen.getByText("97.5%")).toBeTruthy();
    expect(screen.getByText("88.0%")).toBeTruthy();
    expect(screen.getByText("72.3%")).toBeTruthy();
  });

  it("should render failure rates", () => {
    render(<AnchorTable anchors={mockAnchors} />);
    expect(screen.getByText("2.5%")).toBeTruthy();
    expect(screen.getByText("12.0%")).toBeTruthy();
    expect(screen.getByText("27.7%")).toBeTruthy();
  });

  it("should render transaction counts formatted correctly", () => {
    render(<AnchorTable anchors={mockAnchors} />);
    expect(screen.getByText("10K")).toBeTruthy();
    expect(screen.getByText("5K")).toBeTruthy();
    expect(screen.getByText("2K")).toBeTruthy();
  });
});
