# Stellar Insights — Debugging & Integration Workflows

This directory consolidates the documentation deliverables for
[issue #104 — 📚 Comprehensive Integration & Debugging Workflows][issue-104],
plus the diagnostic-tooling code that lives behind the [`SI_DEBUG`] gate in
the Rust backend.

[issue-104]: https://github.com/Stellar-Analysis/frontend/issues/104
[`SI_DEBUG`]: ../../backend/src/debug/mod.rs

## Scope by assignee

`#104` is a multi-contributor deliverable. To avoid three people writing the
same document, the work is split along the layer map:

| Assignee        | Slice                                                | Living at                                    |
| --------------- | ---------------------------------------------------- | -------------------------------------------- |
| `@OsejiFabian`  | Frontend (Next.js) debug workflows + Sentry deep dive | `docs/debugging/frontend-workflows.md` (TBD) |
| `@dorisadams`   | Backend (Rust) debug workflows + WebSocket + tooling | `backend-workflows.md`, `websocket-troubleshooting.md`, `backend/src/debug/` |
| `@Damidesign`   | Mobile (React Native) debug workflows + Flipper guide | `docs/debugging/mobile-workflows.md` (TBD)   |

If you pick up one of the sibling slices, please open a PR **against the same
issue** so the campaign tracker can credit the work together.

## Documents in this folder

- [`backend-workflows.md`](./backend-workflows.md) — comprehensive backend
  (Rust / axum / sqlx / WebSocket) debug workflows. Sets up local SQLite,
  configures `RUST_LOG`, explains `SI_DEBUG`, walks through the
  `traceparent` flow, and covers the most common production-shaped issues.
- [`websocket-troubleshooting.md`](./websocket-troubleshooting.md) —
  focused guide for WebSocket message debugging in the backend (reconnect
  loops, dropped spans, message validation) and the corresponding client
  integrations.
- `frontend-workflows.md` — *pending `@OsejiFabian`.*
- `mobile-workflows.md` — *pending `@Damidesign`.*

## Tooling: `backend/src/debug/`

The Rust backend module `debug::` exposes four development-only helpers,
all gated by `SI_DEBUG`:

| Helper                  | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `is_debug_enabled()`    | Single source of truth for the gate                      |
| `DebugInspector`        | Structured per-request inspection record                 |
| `PerformanceTimer`      | Drop-timer that logs elapsed ms on scope exit            |
| `log_route_table`       | Print registered axum routes                             |

Every public entry point is a **no-op when** `SI_DEBUG` is unset or the
binary is compiled in release mode (`cargo build --release`). The
[`tests`](../../../backend/src/debug/tests.rs) verify that gating in
isolation. This is the assertion that protects against accidental
exposure of request bodies or PII to production logs.

## How the new docs relate to pre-existing ones

These docs are intentionally **additive**. They cross-link, not duplicate:

- [`docs/telemetry-integration.md`](../telemetry-integration.md) — the
  full-stack trace propagation story (W3C `traceparent` flow). Backend
  workflows references it for trace context and does not restate the
  protocol.
- [`docs/integration-testing.md`](../integration-testing.md) — the
  multi-layer regression harness. Backend workflows links to it from the
  "running tests" section instead of duplicating the run commands.
- [`docs/SENTRY_INTEGRATION.md`](../SENTRY_INTEGRATION.md) — Sentry for
  the frontend. Backend workflows references the `tracing`-side
  equivalents instead of restating Sentry configuration.
- [`docs/PERFORMANCE.md`](../PERFORMANCE.md) — frontend perf budgets.
  Backend workflows covers the analogous Rust budgets inline.

If you find yourself about to copy a section from one of those files into
a sibling one — link it instead.
