# WebSocket Troubleshooting

A focused supplement to [`backend-workflows.md`](./backend-workflows.md)
for the WebSocket surface area. Read the backend workflows doc first —
this one only covers the WS-specific bits. Issue context is
[issue #104][issue-104].

[issue-104]: https://github.com/Stellar-Analysis/frontend/issues/104

## TL;DR

```bash
SI_DEBUG=1 RUST_LOG='stellar_insights::websocket=trace,stellar_insights::websocket_trace=trace,axum=info' cargo run
# Reproduce the failing WS in your client
# In the logs, grep for the connection's `ws_connection_id` first, then for
# the W3C trace_id you saw on the matching HTTP request.
```

## Architecture cheat-sheet

The backend WebSocket code lives in:

| Module                           | Role                                                |
| -------------------------------- | --------------------------------------------------- |
| [`backend/src/websocket.rs`](../../backend/src/websocket.rs) | Connection lifecycle, axum WS upgrade handler |
| [`backend/src/websocket_trace.rs`](../../backend/src/websocket_trace.rs) | Per-connection `WsTraceContext`, per-message `TraceAwareMessageHandler` |
| [`backend/src/handlers.rs`](../../backend/src/handlers.rs) | REST → broadcast orchestration that fans messages out to WS subscribers |
| [`backend/src/broadcast.rs`](../../backend/src/broadcast.rs) | In-process broadcast bus for cross-handler fan-out |

A connection's lifetime is: TCP → axum upgrade → `WsTraceContext::new` →
listener loop. Each inbound message is wrapped in a
`TraceAwareMessageHandler` so the resulting spans are siblings of the
connection span in Jaeger.

## The two trace IDs you actually care about

When a WS round-trip goes wrong, two trace IDs are useful:

1. **`ws_connection_id`** — a stable UUID minted by the backend when the
   WS upgrades. Grep the backend logs for this to see every message
   from that connection. Find it in:
   - Server logs: `ws_connection_id` field in the `stellar_insights::websocket_trace` target.
   - Client logs: the `X-WS-Connection-Id` response header on the upgrade response (if your client supports custom WS headers via the `WebSocket` constructor's second argument, this is the value to send).

2. **`traceparent`/`trace_id`** — the W3C TraceContext. Pulled from the
   initial HTTP upgrade and propagated across reconnects by the
   [`TraceAwareMessageHandler`][msg-handler]. This is the ID to put into
   Jaeger.

[msg-handler]: ../../backend/src/websocket_trace.rs

Grep shape that almost always works:

```bash
grep -E 'ws_connection_id=abc-123|trace_id=aaaaaaaaaaaaaaaa' \
  backend.log | less -R
```

## Common failure modes

### A. Client keeps reconnecting every N seconds

Look for:

| Symptom in logs                                        | Likely cause                                    |
| ------------------------------------------------------ | ----------------------------------------------- |
| `close code=1006` from backend                         | Network drop or backend OOM under load          |
| `close code=1011` from backend                         | Backend internal error during message handling  |
| `close code=4001` from backend                         | Auth rejected on reconnect (token expired)      |
| Client reconnects but never reconnects to a working connection | Client caching stale URL with changed port |

Resolution recipe:

1. **Restart the backend in trace mode** with the `TL;DR` env vars above.
2. Trigger the client's reconnect cycle.
3. Grep backend logs for the first `ws_connection_id` that closes with a
   non-`1000` code.
4. Read the spans for the close handler — they typically include the
   cause in a `close_reason` field.
5. If the close is `4001`, check the OAuth refresh flow at
   [`backend/src/auth/sep10_simple.rs`](../../backend/src/auth/sep10_simple.rs).

### B. Backend echoes messages but the client doesn't see updates

This is almost always one of:

- The client is subscribed to a topic that the backend stopped
  publishing to. Run the backend with
  `RUST_LOG=stellar_insights::broadcast=trace` and confirm the publish
  is happening.
- The in-process broadcast bus has two subscribers waiting on
  slightly different topic names. The handler that should fan out is
  in [`backend/src/handlers.rs`](../../backend/src/handlers.rs) —
  grep for `.broadcast(`.
- Tracing context is missing on the message handler — wrap the handler
  body in `TraceAwareMessageHandler::wrap(...)` if a sibling handler
  already does (don't reinvent the pattern).

### C. Trace context drops on reconnect

Open the new connection with the original connection's `traceparent`
header — the `TraceAwareMessageHandler` will pick it up. If your
client doesn't pass `Sec-WebSocket-Protocol` headers naturally,
upgrade via `WebSocket(url, ["traceparent", traceparent_value])` and
the backend will parse it on the upgrade side.

Verify by grep'ing for `trace_id=` in the new connection's spans: it
should match the pre-reconnect value.

### D. Messages arrive out of order

The broadcast bus is **not** implicitly ordered across publishers.
Verify ordering per-publisher at the source (e.g. ingestion ledger
sequence) — see [`backend/src/ingestion/ledger.rs`](../../backend/src/ingestion/ledger.rs)
for the canonical sequence number.

If you need cross-publisher ordering, the integration point is the
`seq` field on broadcast messages. Clients should not assume arrival
order without sequencing on the consumer side.

### E. WebSocket works locally but not in CI

CI is usually missing one of:

1. The `WebSocket` feature flag on `axum` — verify in
   `backend/Cargo.toml` (`axum = { version = "0.7", features = ["ws"] }`).
2. The trace context setup at startup — see
   [`backend/src/observability/trace_context.rs`](../../backend/src/observability/trace_context.rs).
3. The right network policy allowing WS upgrade — see
   [`k8s/network-policy.yaml`](../../k8s/network-policy.yaml).

### F. "Unknown message type" rejections

The backend rejects unknown message types at the WS handler. The
canonical message enums are in
[`backend/src/websocket.rs`](../../backend/src/websocket.rs). When you
add a new variant:

1. Update the enum.
2. Add an arm to the type-safe parser introduced in
   [`feat(websocket): implement type-safe message validation`][feat-ws-validation].
3. Add a test under
   [`backend/tests/websocket_integration_test.rs`](../../backend/tests/websocket_integration_test.rs).

[feat-ws-validation]: ../history/

The rejected message will show up in the logs as a `websocket::parse_error`
span with the offending JSON in the `body_preview` field — that string
is itself replaced with `[REDACTED]` if it matches one of the
[`crate::logging::redaction`][redaction] patterns, so don't expect to
see token prefixes there.

[redaction]: ../../backend/src/logging/redaction.rs

## When to look elsewhere

- HTTP→WS upgrade fails (the upgrade request itself errors out): the
  cause is in the axum routing layer, start at
  [`backend/src/handlers.rs`](../../backend/src/handlers.rs) and the
  request-id middleware.
- FCP / Sentry / external service bounds tracing: see
  [`docs/telemetry-integration.md`](../telemetry-integration.md).
- Client cannot establish a WS to the right host at all: that's a
  deployment / ingress issue, see [`k8s/ingress/ingress.yaml`](../../k8s/ingress/ingress.yaml).

## Pre-#96 stability improvements (for context)

The WebSocket subsystem was hardened across several PRs prior to
`#104`. Notable improvements you will see reflected in the current
backend:

- Type-safe message validation.
- Resilient reconnect with backoff.
- Health UI surfacing connection state.
- Offline fallback to REST reads when WS drops.
- Type-safe parsing anchored on `WsTraceContext`.

If you suspect a regression in any of these, search the issue tracker
for the corresponding label (`websocket`, `resilience`) before
introducing a fix — the diagnostic infra may already exist.
