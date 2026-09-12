import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewDeploymentsList } from "../NewDeploymentsList";
import { TopContractsTable } from "../TopContractsTable";
import { ContractCallsChart } from "@/components/charts/ContractCallsChart";
import {
  fetchSorobanContractCalls,
  fetchSorobanNewDeployments,
  fetchSorobanTopContracts,
} from "@/lib/soroban-api";

describe("NewDeploymentsList", () => {
  it("shows PARTIAL badge and notice when coverage is incomplete", () => {
    render(
      <NewDeploymentsList
        deployments={[]}
        partial
        notice="Coverage incomplete pending contracts-repo events."
      />,
    );

    expect(screen.getByText("PARTIAL")).toBeInTheDocument();
    expect(
      screen.getByText("Coverage incomplete pending contracts-repo events."),
    ).toBeInTheDocument();
    expect(screen.getByText("No deployments reported")).toBeInTheDocument();
  });

  it("renders deployment rows when data is present", () => {
    render(
      <NewDeploymentsList
        deployments={[
          {
            contract_id: "CDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY54N",
            deployed_at: "2026-07-01T12:00:00Z",
            ledger: 12_345_678,
          },
        ]}
        partial={false}
      />,
    );

    expect(screen.getByText("1 FOUND")).toBeInTheDocument();
    expect(screen.getByText(/Ledger 12345678/i)).toBeInTheDocument();
  });
});

describe("TopContractsTable", () => {
  it("shows empty state when there are no contracts", () => {
    render(<TopContractsTable contracts={[]} windowLabel="7d" />);
    expect(
      screen.getByText("No contract activity in this window"),
    ).toBeInTheDocument();
  });

  it("renders ranked contracts", () => {
    render(
      <TopContractsTable
        contracts={[
          {
            contract_id: "CDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY54N",
            call_count: 1200,
            event_count: 40,
          },
        ]}
      />,
    );

    expect(screen.getByText("TOP_1")).toBeInTheDocument();
    expect(screen.getByText("1.2K")).toBeInTheDocument();
  });
});

describe("ContractCallsChart", () => {
  it("shows empty state when series is missing", () => {
    render(<ContractCallsChart data={[]} />);
    expect(screen.getByText("Contract Calls")).toBeInTheDocument();
    expect(
      screen.getByText(/No contract-call time series yet/i),
    ).toBeInTheDocument();
  });

  it("renders summary stats from series data", () => {
    render(
      <ContractCallsChart
        data={[
          { date: "2026-07-01", count: 100 },
          { date: "2026-07-02", count: 250 },
          { date: "2026-07-03", count: 175 },
        ]}
      />,
    );

    expect(screen.getByText("Latest day")).toBeInTheDocument();
    expect(screen.getByText("Period total")).toBeInTheDocument();
    expect(screen.getByText("525")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
  });
});

describe("soroban-api empty/partial fallbacks", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty top contracts on network failure", async () => {
    const result = await fetchSorobanTopContracts();
    expect(result.contracts).toEqual([]);
    expect(result.window).toBe("7d");
  });

  it("returns partial empty deployments on network failure", async () => {
    const result = await fetchSorobanNewDeployments();
    expect(result.partial).toBe(true);
    expect(result.deployments).toEqual([]);
    expect(result.notice).toMatch(/incomplete|unavailable/i);
  });

  it("returns empty contract-calls series on network failure", async () => {
    const result = await fetchSorobanContractCalls();
    expect(result.points).toEqual([]);
    expect(result.metric).toBe("events");
  });
});

describe("fetchSorobanContractCalls normalization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes a bare {date,count} array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => [
            { date: "2026-07-02", count: 20 },
            { date: "2026-07-01", count: 10 },
          ],
        }),
      ),
    );

    const result = await fetchSorobanContractCalls(7);
    expect(result.points).toEqual([
      { date: "2026-07-01", count: 10 },
      { date: "2026-07-02", count: 20 },
    ]);
  });
});
