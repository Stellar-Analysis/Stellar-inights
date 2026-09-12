import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { ContractSubmissionService } from "../services/contractSubmission";

// Shared mock fixtures (also consumed by the backend and mobile contract-flow
// regression suites, see docs/integration-testing.md).
const fixture = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../fixtures/contract-flow.json"),
    "utf-8"
  )
);

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

const baseRequest = {
  contractId: fixture.contractSubmission.contractId,
  functionName: fixture.contractSubmission.functionName,
  args: fixture.contractSubmission.args,
};

describe("ContractSubmissionService", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("simulates, submits, and confirms a contract transaction end-to-end", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/contracts/simulate")) {
        return jsonResponse({ transactionData: fixture.contractSubmission.simulatedEnvelope });
      }
      if (url.includes("/contracts/submit")) {
        return jsonResponse({ hash: fixture.contractSubmission.transactionHash });
      }
      if (url.includes("/contracts/status/")) {
        return jsonResponse({
          status: "success",
          ledger: fixture.contractSubmission.confirmedLedger,
        });
      }
      throw new Error(`unexpected fetch to ${url}`);
    });

    const service = new ContractSubmissionService("http://localhost:3000");
    const result = await service.submitTransaction(baseRequest);

    expect(result).toEqual({
      success: true,
      transactionHash: fixture.contractSubmission.transactionHash,
      ledger: fixture.contractSubmission.confirmedLedger,
      retryable: false,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/contracts/simulate",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("retries a transient simulation failure and eventually succeeds", async () => {
    vi.useFakeTimers();
    let simulateAttempts = 0;

    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/contracts/simulate")) {
        simulateAttempts += 1;
        if (simulateAttempts < 2) {
          throw new Error("network error: connection reset");
        }
        return jsonResponse({ transactionData: fixture.contractSubmission.simulatedEnvelope });
      }
      if (url.includes("/contracts/submit")) {
        return jsonResponse({ hash: fixture.contractSubmission.transactionHash });
      }
      if (url.includes("/contracts/status/")) {
        return jsonResponse({
          status: "success",
          ledger: fixture.contractSubmission.confirmedLedger,
        });
      }
      throw new Error(`unexpected fetch to ${url}`);
    });

    const service = new ContractSubmissionService("http://localhost:3000");
    const pending = service.submitTransaction(baseRequest);

    await vi.advanceTimersByTimeAsync(1000); // first retry backoff
    const result = await pending;

    expect(simulateAttempts).toBe(2);
    expect(result.success).toBe(true);
    expect(result.transactionHash).toBe(fixture.contractSubmission.transactionHash);
  });

  it("returns a retryable error when simulation fails on every attempt", async () => {
    vi.useFakeTimers();

    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/contracts/simulate")) {
        throw new Error(fixture.contractSubmissionFailure.error);
      }
      throw new Error(`unexpected fetch to ${url}`);
    });

    const service = new ContractSubmissionService("http://localhost:3000");
    const pending = service.submitTransaction(baseRequest);

    await vi.advanceTimersByTimeAsync(1000); // backoff after attempt 1
    await vi.advanceTimersByTimeAsync(2000); // backoff after attempt 2
    const result = await pending;

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(fixture.contractSubmissionFailure.retryable);
    expect(result.error).toContain("temporarily unavailable");
    expect(mockFetch).toHaveBeenCalledTimes(3); // maxRetries
  });

  it("returns a non-retryable error when the backend rejects the signed envelope", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/contracts/simulate")) {
        return jsonResponse({ transactionData: fixture.contractSubmission.simulatedEnvelope });
      }
      if (url.includes("/contracts/submit")) {
        return jsonResponse({ message: "Invalid signature" }, false, 400);
      }
      throw new Error(`unexpected fetch to ${url}`);
    });

    const service = new ContractSubmissionService("http://localhost:3000");
    const result = await service.submitTransaction(baseRequest);

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.error).toContain("Invalid signature");
  });

  it("propagates an on-chain transaction failure surfaced during confirmation polling", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/contracts/simulate")) {
        return jsonResponse({ transactionData: fixture.contractSubmission.simulatedEnvelope });
      }
      if (url.includes("/contracts/submit")) {
        return jsonResponse({ hash: fixture.contractSubmission.transactionHash });
      }
      if (url.includes("/contracts/status/")) {
        return jsonResponse({ status: "failed", error: "insufficient trustline limit" });
      }
      throw new Error(`unexpected fetch to ${url}`);
    });

    const service = new ContractSubmissionService("http://localhost:3000");
    const result = await service.submitTransaction(baseRequest);

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.error).toContain("insufficient trustline limit");
  });
});
