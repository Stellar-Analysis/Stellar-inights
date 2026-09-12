/**
 * API Client with CSRF Protection and Distributed Tracing
 *
 * Provides type-safe API methods with automatic CSRF token handling
 * for all state-changing operations, and trace context injection for
 * distributed tracing across services.
 */

import {
  getOrCreateTraceContext,
  formatTraceparentHeader
} from './telemetry';

interface ApiOptions extends RequestInit {
  skipCsrf?: boolean;
}

/**
 * Get CSRF token from meta tag or cookie
 */
function getCsrfToken(): string | null {
  // Try meta tag first (for SSR pages)
  const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (metaToken) return metaToken;
  
  // Fallback to cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}

function getRetryDelay(response: Response): number {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 10_000);
    }
  }
  return 1000;
}

/**
 * Base fetch wrapper with CSRF protection and 503 retry
 * Base fetch wrapper with CSRF protection and trace context injection
 */
async function apiFetch(url: string, options: ApiOptions = {}): Promise<Response> {
  const { skipCsrf = false, headers = {}, ...restOptions } = options;

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add trace context for distributed tracing
  try {
    const traceContext = getOrCreateTraceContext();
    const traceparent = formatTraceparentHeader(traceContext);
    requestHeaders['traceparent'] = traceparent;
  } catch (e) {
    console.warn('Failed to inject trace context:', e);
  }

  // Add CSRF token for state-changing methods
  const method = options.method?.toUpperCase();
  if (!skipCsrf && method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
      throw new Error('CSRF token not found. Please refresh the page.');
    }
    requestHeaders['X-CSRF-Token'] = csrfToken;
  }

  const fetchOpts = { ...restOptions, method, headers: requestHeaders };

  let response = await fetch(url, fetchOpts);

  // Retry once on 503 (K8s rolling deployment window)
  if (response.status === 503) {
    const delay = getRetryDelay(response);
    await new Promise((resolve) => setTimeout(resolve, delay));
    response = await fetch(url, fetchOpts);
  }

  // Handle CSRF token errors
  if (response.status === 403) {
    const data = await response.json().catch(() => ({}));
    if (data.error?.includes('CSRF')) {
      throw new Error('Security validation failed. Please refresh the page and try again.');
    }
  }

  return response;
}

/**
 * GET request
 */
export async function apiGet<T = any>(url: string, options?: ApiOptions): Promise<T> {
  const response = await apiFetch(url, { ...options, method: 'GET' });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * POST request with CSRF protection
 */
export async function apiPost<T = any>(url: string, data?: any, options?: ApiOptions): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * PUT request with CSRF protection
 */
export async function apiPut<T = any>(url: string, data?: any, options?: ApiOptions): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * PATCH request with CSRF protection
 */
export async function apiPatch<T = any>(url: string, data?: any, options?: ApiOptions): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * DELETE request with CSRF protection
 */
export async function apiDelete<T = any>(url: string, options?: ApiOptions): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Recover from stale cached/offline data by reconciling with the server.
 *
 * Wraps the existing `/api/rpc/reconcile` endpoint. Pair this with
 * `useLocalStorage`'s `isStale` flag and `invalidate()`: when a cached value
 * is reported stale, call this with the timestamp it was last refreshed and
 * use the returned updates to refresh local state before invalidating.
 */
export async function apiReconcile<T = any>(
  dataTypes: string[],
  lastKnownTimestamp?: string,
  options?: ApiOptions
): Promise<T> {
  return apiPost<T>('/api/rpc/reconcile', {
    data_types: dataTypes,
    last_known_timestamp: lastKnownTimestamp,
  }, options);
}
