import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Validates that ErrorBoundary does not leak sensitive details in its UI or logs.

const ThrowWith = ({ message }: { message: string }) => {
  throw new Error(message);
};

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('ErrorBoundary – production safety', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a fallback UI and not the raw error message when an error is thrown', () => {
    const sensitiveMessage = 'DB connection string: postgresql://admin:secret@db:5432';

    render(
      <ErrorBoundary>
        <ThrowWith message={sensitiveMessage} />
      </ErrorBoundary>,
    );

    // The raw sensitive connection string must not appear in rendered output
    expect(screen.queryByText(sensitiveMessage)).toBeNull();
    // Generic error UI should be shown instead
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('does not render a raw JavaScript stack trace in the DOM', () => {
    render(
      <ErrorBoundary>
        <ThrowWith message="TypeError: cannot read property of undefined" />
      </ErrorBoundary>,
    );

    const bodyText = document.body.textContent ?? '';
    // Stack frames look like "at Component (file.tsx:42)"
    expect(bodyText).not.toMatch(/at \w+ \(.+\.tsx?:\d+/);
  });

  it('renders custom fallback prop without exposing error internals', () => {
    const fallback = <div role="status">Something went wrong. Please try again.</div>;

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowWith message="private_key=0xdeadbeef" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText(/private_key/)).toBeNull();
  });

  it('calls logger.error with the caught error without re-throwing', async () => {
    const { logger } = await import('@/lib/logger');

    render(
      <ErrorBoundary>
        <ThrowWith message="some error" />
      </ErrorBoundary>,
    );

    expect(logger.error).toHaveBeenCalledOnce();
    // First arg to logger.error should be a descriptive string, not the raw error message
    const firstArg = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(typeof firstArg).toBe('string');
  });

  it('does not expose onError callback errors to the UI', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowWith message="user_token=supersecret123" />
      </ErrorBoundary>,
    );

    // onError is called for observability but the token must not appear in DOM
    expect(onError).toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('supersecret123');
  });
});
