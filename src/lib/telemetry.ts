/**
 * Telemetry and trace context management for frontend.
 *
 * This module provides utilities for generating and managing W3C TraceContext
 * (traceparent headers) to enable distributed tracing across frontend, backend,
 * and mobile services.
 */

import { v4 as uuidv4 } from 'uuid';

export interface TraceContext {
  /** The trace ID (128-bit hex string) */
  traceId: string;
  /** The parent span ID (64-bit hex string) */
  parentSpanId: string;
  /** The trace flags (sampled: 01, not sampled: 00) */
  flags: string;
}

/**
 * Storage key for persisting trace context across page navigation.
 */
const TRACE_CONTEXT_STORAGE_KEY = 'stellar_insights_trace_context';

/**
 * TraceContext Storage Manager
 *
 * Handles persistence of trace context in sessionStorage so that the same
 * trace ID is used for all requests within a user session.
 */
export class TraceContextStorage {
  /**
   * Get the current trace context from sessionStorage, or undefined if not set.
   */
  static get(): TraceContext | undefined {
    try {
      const stored = sessionStorage.getItem(TRACE_CONTEXT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : undefined;
    } catch (e) {
      console.error('Failed to retrieve trace context from storage:', e);
      return undefined;
    }
  }

  /**
   * Save trace context to sessionStorage.
   */
  static set(context: TraceContext): void {
    try {
      sessionStorage.setItem(TRACE_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    } catch (e) {
      console.error('Failed to save trace context to storage:', e);
    }
  }

  /**
   * Generate a new trace context.
   */
  static generate(): TraceContext {
    const traceId = uuidv4().replace(/-/g, '').substring(0, 32);
    const parentSpanId = generateSpanId();

    return {
      traceId,
      parentSpanId,
      flags: '01', // Sampled
    };
  }

  /**
   * Clear the stored trace context.
   */
  static clear(): void {
    try {
      sessionStorage.removeItem(TRACE_CONTEXT_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear trace context:', e);
    }
  }
}

/**
 * Generate a random span ID (64-bit hex string).
 */
export function generateSpanId(): string {
  return Math.random().toString(16).substring(2, 18).padStart(16, '0');
}

/**
 * Get or create a trace context.
 *
 * If a trace context already exists in storage, it will be reused.
 * Otherwise, a new one will be generated and stored.
 */
export function getOrCreateTraceContext(): TraceContext {
  const existing = TraceContextStorage.get();
  if (existing) {
    return existing;
  }

  const context = TraceContextStorage.generate();
  TraceContextStorage.set(context);
  return context;
}

/**
 * Format a trace context as a W3C TraceContext traceparent header.
 *
 * Format: `00-{trace_id}-{span_id}-{flags}`
 * Example: `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
 */
export function formatTraceparentHeader(
  context: TraceContext,
  currentSpanId?: string
): string {
  const spanId = currentSpanId || generateSpanId();
  return `00-${context.traceId}-${spanId}-${context.flags}`;
}

/**
 * Extract trace ID from a traceparent header string.
 *
 * Returns the trace ID portion (32-character hex string) or undefined if invalid.
 */
export function extractTraceIdFromHeader(traceparentHeader: string): string | undefined {
  const parts = traceparentHeader.split('-');
  if (parts.length >= 2) {
    return parts[1];
  }
  return undefined;
}

/**
 * Initialize telemetry for the current page load.
 *
 * This should be called once during app initialization to set up
 * the trace context for the entire session.
 */
export function initializeTelemetry(): TraceContext {
  const context = getOrCreateTraceContext();

  // Log telemetry initialization
  if (typeof window !== 'undefined' && window.console) {
    console.debug('Telemetry initialized', { traceId: context.traceId });
  }

  return context;
}

/**
 * Log a telemetry event with the current trace context.
 */
export function logTelemetryEvent(
  eventName: string,
  data: Record<string, unknown> = {}
): void {
  const context = TraceContextStorage.get();

  if (typeof window !== 'undefined' && window.console) {
    console.log(`[${eventName}]`, {
      ...data,
      traceId: context?.traceId,
      timestamp: new Date().toISOString(),
    });
  }
}
