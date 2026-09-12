/**
 * Contract Submission Service for Frontend
 * Handles contract transaction submission, validation, and error handling
 */

import { z } from "zod";
import { logger } from "@/lib/logger";

// Types for contract transaction submission
export interface ContractTransaction {
  id: string;
  contractId: string;
  functionName: string;
  args: ContractArg[];
  simulatedEnvelope?: string;
  signedEnvelope?: string;
  submissionStatus: "pending" | "simulating" | "signing" | "submitting" | "confirmed" | "failed";
  transactionHash?: string;
  ledger?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractArg {
  type: "u64" | "u32" | "i64" | "i32" | "bytes" | "string" | "bool" | "address";
  value: string;
}

export interface ContractSubmissionResult {
  success: boolean;
  transactionHash?: string;
  ledger?: number;
  error?: string;
  retryable: boolean;
}

// Validation schemas
const ContractArgSchema = z.object({
  type: z.enum(["u64", "u32", "i64", "i32", "bytes", "string", "bool", "address"]),
  value: z.string(),
});

const ContractTransactionSchema = z.object({
  contractId: z.string().startsWith("C"),
  functionName: z.string().min(1),
  args: z.array(ContractArgSchema),
});

/**
 * Contract Submission Service
 * Manages the full lifecycle of contract transaction submission
 */
export class ContractSubmissionService {
  private readonly backendUrl: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelayMs: number = 1000;

  constructor(backendUrl: string = process.env.REACT_APP_API_URL || "http://localhost:3000") {
    this.backendUrl = backendUrl;
  }

  /**
   * Submit a contract transaction
   * Validates, simulates, and submits to the backend for signing
   */
  async submitTransaction(request: z.infer<typeof ContractTransactionSchema>): Promise<ContractSubmissionResult> {
    try {
      // Validate input
      const validatedRequest = ContractTransactionSchema.parse(request);

      logger.info('ContractSubmission: starting submission', { contractId: validatedRequest.contractId });

      // Step 1: Build the transaction
      const transaction = this.buildTransaction(validatedRequest);

      // Step 2: Simulate the transaction
      const simulated = await this.simulateTransaction(transaction);

      // Step 3: Send to backend for signing and submission
      const result = await this.submitToBackend(simulated);

      // Step 4: Poll for confirmation
      if (result.transactionHash) {
        const confirmed = await this.pollForConfirmation(result.transactionHash);
        return confirmed;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error('ContractSubmission: submission failed', error as Error, { errorMessage });

      return {
        success: false,
        error: errorMessage,
        retryable: this.isRetryableError(error),
      };
    }
  }

  /**
   * Simulate a transaction to get resource estimates
   */
  private async simulateTransaction(transaction: ContractTransaction): Promise<ContractTransaction> {
    const maxAttempts = this.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        logger.debug('ContractSubmission: simulating transaction', { attempt: attempt + 1, maxAttempts });

        const response = await fetch(`${this.backendUrl}/api/v1/contracts/simulate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contractId: transaction.contractId,
            functionName: transaction.functionName,
            args: transaction.args,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Simulation failed: ${error.message || response.statusText}`);
        }

        const simulated = await response.json();

        if (!simulated.transactionData) {
          throw new Error("Simulation did not return transaction data");
        }

        transaction.simulatedEnvelope = simulated.transactionData;
        transaction.submissionStatus = "signing";

        logger.debug('ContractSubmission: simulation successful');
        return transaction;
      } catch (error) {
        lastError = error as Error;
        logger.warn('ContractSubmission: simulation attempt failed', {
          attempt: attempt + 1,
          error: lastError.message,
        });

        if (attempt < maxAttempts - 1) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt);
          logger.debug('ContractSubmission: retrying simulation', { delayMs });
          await this.delay(delayMs);
        }
      }
    }

    throw lastError || new Error("Simulation failed after all retries");
  }

  /**
   * Submit the transaction to the backend for signing and submission
   */
  private async submitToBackend(transaction: ContractTransaction): Promise<ContractSubmissionResult> {
    try {
      if (!transaction.simulatedEnvelope) {
        throw new Error("No simulated envelope available");
      }

      logger.info('ContractSubmission: sending to backend for signing');

      const response = await fetch(`${this.backendUrl}/api/v1/contracts/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionData: transaction.simulatedEnvelope,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Backend submission failed: ${error.message || response.statusText}`);
      }

      const result = await response.json();

      if (!result.hash) {
        throw new Error("Backend did not return transaction hash");
      }

      logger.info('ContractSubmission: backend submission successful', { hash: result.hash });

      return {
        success: true,
        transactionHash: result.hash,
        retryable: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown backend error";
      logger.error('ContractSubmission: backend error', error as Error, { message });

      return {
        success: false,
        error: message,
        retryable: this.isRetryableError(error),
      };
    }
  }

  /**
   * Poll for transaction confirmation
   */
  private async pollForConfirmation(
    transactionHash: string,
    maxWaitMs: number = 60000
  ): Promise<ContractSubmissionResult> {
    const pollIntervalMs = 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const response = await fetch(
          `${this.backendUrl}/api/v1/contracts/status/${transactionHash}`
        );

        if (!response.ok) {
          // 404 means not confirmed yet
          if (response.status === 404) {
            await this.delay(pollIntervalMs);
            continue;
          }

          throw new Error(`Status check failed: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.status === "success") {
          logger.info('ContractSubmission: transaction confirmed', { transactionHash, ledger: result.ledger });
          return {
            success: true,
            transactionHash,
            ledger: result.ledger,
            retryable: false,
          };
        }

        if (result.status === "failed") {
          throw new Error(`Transaction failed: ${result.error || "Unknown reason"}`);
        }

        // Still pending
        await this.delay(pollIntervalMs);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.error('ContractSubmission: confirmation polling error', error as Error, { message });

        // Timeout errors are retryable
        if (Date.now() - startTime >= maxWaitMs) {
          return {
            success: false,
            error: "Confirmation timeout",
            retryable: true,
            transactionHash,
          };
        }

        return {
          success: false,
          error: message,
          retryable: this.isRetryableError(error),
          transactionHash,
        };
      }
    }

    return {
      success: false,
      error: "Confirmation timeout",
      retryable: true,
      transactionHash,
    };
  }

  /**
   * Build a contract transaction object
   */
  private buildTransaction(
    request: z.infer<typeof ContractTransactionSchema>
  ): ContractTransaction {
    return {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contractId: request.contractId,
      functionName: request.functionName,
      args: request.args,
      submissionStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    // Network errors
    if (message.includes("network") || message.includes("timeout")) {
      return true;
    }

    // Transient RPC errors
    if (message.includes("not found") || message.includes("temporarily")) {
      return true;
    }

    return false;
  }

  /**
   * Utility to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * React Hook for Contract Submission
 */
import { useState, useCallback } from "react";

export function useContractSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [ledger, setLedger] = useState<number | null>(null);

  const service = new ContractSubmissionService();

  const submit = useCallback(
    async (request: z.infer<typeof ContractTransactionSchema>) => {
      try {
        setIsSubmitting(true);
        setError(null);
        setTransactionHash(null);
        setLedger(null);

        const result = await service.submitTransaction(request);

        if (result.success) {
          setTransactionHash(result.transactionHash || null);
          setLedger(result.ledger || null);
        } else {
          setError(result.error || "Submission failed");
        }

        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    submit,
    isSubmitting,
    error,
    transactionHash,
    ledger,
  };
}
