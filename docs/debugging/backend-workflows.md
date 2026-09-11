# Backend Debug Workflows

A practical field guide for debugging the Stellar Insights Rust backend
(`backend/`) locally. This document is the dorisadams slice of
[issue #104][issue-104]; the frontend and mobile slices are tracked
separately and live at [`frontend-workflows.md`](./frontend-workflows.md)
(pending) and [`mobile-workflows.md`](./mobile-workflows.md) (pending).

[issue-104]: https://github.com/Stellar-Analysis/frontend/issues/104

## TL;DR

```bash
# Local backend with everything turned on
cd backend
cp .env.example .env  # if missing
SI_DEBUG=1 RUST_LOG=stellar_insights=debug,debug=trace cargo run

# In another shell, hit a smoke endpoint
curl -H 'X-Request-ID: smoke-1' http://localhost:8000/health
```

That single env var (`SI_DEBUG=1`) turns on the new
[`debug::DebugInspector`][debug-mod], drops a [`PerformanceTimer`][debug-mod]
at every labeled scope, and prints the registered axum route table once
on startup. In release builds (`cargo run --release`), all of those are
no-ops even if `SI_DEBUG` is set.

[debug-mod]: ../../backend/src/debug/mod.rs

---

## 1. Getting to a runnable backend

### 1.1. SQLite for local development

The backend defaults to PostgreSQL in production, but SQLite is wired in
and is the fastest path to a runnable local backend:

```bash
cd backend
echo 'DATABASE_URL=sqlite:./stellar_insights.db' > .env
sqlx database create
cargo run --bin setup_db   # creates the schema
cargo run                  # starts the api on $BIND_ADDR (default 0.0.0.0:8000)
```

If you need the migrations script, see [`backend/scripts/migrate.sh`](../../backend/scripts/migrate.sh).

### 1.2. PostgreSQL locally

If you want to reproduce a production-shaped local backend, point at a
local Postgres and run the full migration set:

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/stellar_insights
bash backend/scripts/migrate.sh
```

The migrations under [`backend/migrations/`](../../backend/migrations/)
are idempotent (`*.up.sql` paired with `*.down.sql`) — re-running is
safe.

### 1.3. Required vs. optional env vars

| Var                       | Required | Notes                                          |
| ------------------------- | -------- | ---------------------------------------------- |
| `DATABASE_URL`            | yes      | `sqlite:./stellar_insights.db` for dev         |
| `RUST_LOG`                | yes      | see [§2.1](#21-setting-rust_log)               |
| `LOG_FORMAT`              | optional | `json` (default) or `pretty`                    |
| `BIND_ADDR`               | optional | default `0.0.0.0:8000`                          |
| `SI_DEBUG`                | optional | enables [`debug::`][debug-mod] when `1`        |
| `OTEL_ENABLED`            | optional | enables OpenTelemetry export when `true`       |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | optional | Jaeger/OTLP collector endpoint              |
| `LOGSTASH_*` / `ELASTICSEARCH_URL` / `KIBANA_URL` | optional | forward logs to ELK        |

The minimum to start the server is `DATABASE_URL`. Everything else has a
default.

> **Don't** put real Vault tokens in `.env`. The example file uses
> placeholders — see [`docs/SECRETS_MANAGEMENT.md`](../SECRETS_MANAGEMENT.md)
> for how production secrets are wired.

---

## 2. Logging

### 2.1. Setting `RUST_LOG`

`RUST_LOG` accepts a `target=level` syntax. Useful presets:

```bash
# Quiet default — info and above
RUST_LOG=info

# Backend only, debug level on our code
RUST_LOG=stellar_insights=debug

# Backend debug + trace on the new debug module
RUST_LOG=stellar_insights=debug,debug=trace

# WebSocket subsystem plus axum internals
RUST_LOG=stellar_insights::websocket=trace,axum=info
```

The `debug` target used by [`debug::DebugInspector`][debug-mod] and
[`PerformanceTimer`][debug-mod] is `stellar_insights::debug`. Filter on
that target to silence everything except the dev-only inspection logs:

```bash
RUST_LOG='stellar_insights::debug=trace,info'
```

### 2.2. JSON vs. pretty

`LOG_FORMAT=json` produces one structured JSON record per log line —
designed for the ELK stack. `LOG_FORMAT=pretty` produces human-readable
output with spans — better when you're reading the terminal.

### 2.3. Redaction

The [`crate::logging::redaction`][redaction-mod] module wraps sensitive
strings (`Redacted<T>`) and supplies free functions for Stellar account
addresses, transaction hashes, JWTs, API keys, etc. Use them, don't roll
your own — the regex set is curated and tested.

[redaction-mod]: ../../backend/src/logging/redaction.rs

**Never** log raw secret keys (`S...`), API keys, or JWT tokens, even
when `SI_DEBUG=1`. The debug module does not redact by itself — that's
still your responsibility.

---

## 3. The `SI_DEBUG` gate

The new [`backend/src/debug/`][debug-mod] module is the on-ramp for
request-level inspection during development. Three things to know:

### 3.1. It is a no-op in release

The gate evaluates `cfg!(debug_assertions)`. A release binary cannot
enable it even if `SI_DEBUG=1` is set. Verified by
[`backend/src/debug/tests.rs`][debug-tests].

### 3.2. It's the only environment variable you need to remember

```bash
SI_DEBUG=1 cargo run
```

Accepts `1`, `true`, `yes`, `on` (case-insensitive). Anything else —
including empty string — disables it.

### 3.3. What turns on

- `debug::inspect_request(...)` is called from handlers and emits a
  one-line `debug_inspector` trace record at info level.
- `debug_timer!("label")` macros log elapsed wall-clock time when the
  scope exits.
- `debug::log_route_table(&app_state)` runs at startup and prints the
  registered routes.

These all share the [`stellar_insights::debug`][debug-mod] tracing
target, so you can filter them in or out as a unit.

[debug-tests]: ../../backend/src/debug/tests.rs

---

## 4. Tracing requests end-to-end

### 4.1. Request ID injection

Every inbound HTTP request goes through the
[`request_id_middleware`][req-id] which:

1. Honors an upstream `X-Request-ID` header if present (useful for
   federation with sibling services).
2. Otherwise mints a UUID v4.
3. Stores it in `axum::Extension` for handlers.
4. Includes it in the response as `X-Request-ID`.

When you grep logs for a failing request, grep for the `X-Request-ID` —
that string flows through backend → RPC → background jobs → WebSocket.

[req-id]: ../../backend/src/request_id.rs

### 4.2. Trace context (`traceparent`)

The full-stack W3C TraceContext story is documented at
[`docs/telemetry-integration.md`](../telemetry-integration.md). Two
practical pointers:

```bash
# 1. Inject from curl
curl -H 'traceparent: 00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01' \
     http://localhost:8000/api/payments

# 2. Confirm the trace_id shows up in Jaeger
xdg-open http://localhost:16686  # local Jaeger UI
```

### 4.3. WebSocket trace context

WebSocket connections establish their own trace context per the
[`crate::websocket_trace`][ws-trace] module. Each connection carries a
`WsTraceContext` and each message call wraps a `TraceAwareMessageHandler`
so a single message's spans are linkable to the connection.

[ws-trace]: ../../backend/src/websocket_trace.rs

If you lose the traceparent across a WS reconnect, see
[`websocket-troubleshooting.md`](./websocket-troubleshooting.md).

---

## 5. Common failure modes (and where to look)

### 5.1. "I started the backend and the first request 500'd"

Walk down this checklist in order:

| Symptom                                | Where to look                                      |
| -------------------------------------- | -------------------------------------------------- |
| DB connection refused                 | `DATABASE_URL`, port 5432 / `sqlite:./...` path    |
| Migrations not applied                | `bash backend/scripts/migrate.sh` then re-run      |
| Vault 401 on startup                  | `VAULT_ADDR` / `VAULT_TOKEN` (or switch to `.env`) |
| Feature flags / config missing        | Check `backend/src/env_config.rs` `EnvConfig::from_env` |

### 5.2. "WebSockets keep reconnecting"

Go to [`websocket-troubleshooting.md`](./websocket-troubleshooting.md).
Short version: check the client logs for the `close` code, then the
backend `websocket_trace` target for the corresponding connection span.

### 5.3. "Logs are noisy"

Defaults are intentional. Two starting points:

```bash
# Quiet down everything except our crate's warnings-and-up
RUST_LOG=warn,stellar_insights=info

# Quiet everything except the debug module
RUST_LOG='stellar_insights::debug=trace,off'
```

### 5.4. "Something is slow"

Start with `SI_DEBUG=1` and let the [`PerformanceTimer`][debug-mod]
drop records mark the slow scopes. Compare:

```bash
# Cold
SI_DEBUG=1 cargo run
time curl http://localhost:8000/api/corridors/USDC:GABC->XLM:native  | head -c 200

# Warm
time curl http://localhost:8000/api/corridors/USDC:GABC->XLM:native  | head -c 200
```

The cold/warm delta usually lives in cache hydration — see [`cache.rs`](../../backend/src/cache.rs).

### 5.5. "A test fails locally but not in CI (or vice versa)"

The test harness is the multi-layer regression runner at
[`docs/integration-testing.md`](../integration-testing.md). Match what
CI does:

```bash
cd backend
cargo test --workspace -- --nocapture
```

---

## 6. Debugging a single handler

The fastest way to debug a single handler without inventing test
fixtures is:

```bash
SI_DEBUG=1 RUST_LOG=stellar_insights=debug cargo run \
  --example rpc_demo
```

Examples live in [`backend/examples/`](../../backend/examples/). They
short-circuit middleware so the handler runs in isolation. Useful for
reproducing bugs that need a real RPC node but don't need the full
routing/auth/observability stack.

For "what does an OAuth/JWT flow look like":
[`backend/examples/ml_test.rs`](../../backend/examples/ml_test.rs)
covers ML scoring;
[`aggregation_demo.rs`](../../backend/examples/aggregation_demo.rs)
covers corridor aggregation; the WebSocket counterparts live alongside.

---

## 7. When you've found the bug

1. Reproduce with the smallest possible test under
   `backend/tests/`. The harness at
   [`docs/integration-testing.md`](../integration-testing.md) shows the
   cross-layer pattern.
2. Write a regression test that fails **before** the fix and passes
   **after**. Issue `#104` is short on test-fixing specifically — the
   gate tests in `backend/src/debug/tests.rs` are an example of the
   shape.
3. Profile with `cargo flamegraph` only when the fix is non-trivial —
   most "this is slow" reports resolve at the cache layer.

---

## 8. Related documentation

- [`docs/debugging/INDEX.md`](./INDEX.md) — debug docs index, including
  the frontend and mobile slices.
- [`docs/telemetry-integration.md`](../telemetry-integration.md) — full
  trace propagation story.
- [`docs/integration-testing.md`](../integration-testing.md) —
  multi-layer regression test harness.
- [`docs/SECRETS_MANAGEMENT.md`](../SECRETS_MANAGEMENT.md) — how Vault
  secrets are wired into the backend.
- [`docs/PERFORMANCE.md`](../PERFORMANCE.md) — frontend budgets (the
  backend has analogous budgets inline above).
- [`docs/THREAT_MODEL.md`](../THREAT_MODEL.md) and
  [`docs/security-hardening.md`](../security-hardening.md) for
  security-sensitive debugging (e.g. you suspect an auth bypass).
