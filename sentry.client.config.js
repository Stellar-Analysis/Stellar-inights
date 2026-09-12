import * as Sentry from "@sentry/nextjs";

// Only initialise telemetry when a DSN is explicitly configured.
// This prevents accidental data transmission in environments where
// NEXT_PUBLIC_SENTRY_DSN is absent (e.g. CI, local dev without .env).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,

    // Release tracking for source map uploads
    release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",

    // Error sampling (100% for now, can be adjusted in production)
    errorSampleRate: 1.0,

    // Attach user context to errors
    initialScope: {
      tags: {
        component: "frontend",
        platform: "web",
      },
    },

    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
      // Breadcrumbs for user actions
      new Sentry.Breadcrumbs({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        sentry: true,
        xhr: true,
      }),
    ],

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      // Random plugins/extensions
      "chrome-extension://",
      "moz-extension://",
      // Network errors that are expected
      "NetworkError",
      "Network request failed",
    ],

    // Before sending to Sentry
    beforeSend(event, hint) {
      // Filter out errors from browser extensions
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === "string" && error.includes("chrome-extension")) {
          return null;
        }
      }

      // Redact sensitive data from event context
      if (event.extra) {
        event.extra = redactSentryData(event.extra);
      }

      if (event.contexts) {
        event.contexts = redactSentryData(event.contexts);
      }

      if (event.user) {
        // Keep user ID but redact other potentially sensitive user data
        event.user = {
          id: event.user.id,
        };
      }

      // Redact sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
          ...breadcrumb,
          data: breadcrumb.data ? redactSentryData(breadcrumb.data) : undefined,
          message: breadcrumb.message ? redactSensitiveString(breadcrumb.message) : undefined,
        }));
      }

      return event;
    },
  });
}

/**
 * Redact sensitive data from Sentry event data
 */
function redactSentryData(data) {
  const result = {};

  for (const [key, value] of Object.entries(data)) {
    if (/password|secret|token|key|auth|credential|private|seed|mnemonic|jwt|bearer/i.test(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      result[key] = redactSensitiveString(value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactSentryData(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Redact sensitive patterns from strings
 */
function redactSensitiveString(str) {
  return str
    // Redact Stellar addresses
    .replace(/G[A-Z0-9]{55}/g, "G****[REDACTED]")
    // Redact Stellar secrets
    .replace(/S[A-Z0-9]{55}/g, "S****[REDACTED_SECRET]")
    // Redact JWT tokens
    .replace(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, "[REDACTED_JWT]")
    // Redact hex/base64 API keys (min 32 chars, not a known route segment)
    .replace(/\b[A-Fa-f0-9]{32,64}\b/g, "[REDACTED_KEY]")
    // Redact emails
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "****@[REDACTED]");
}
