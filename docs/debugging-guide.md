# Stellar Insights — Debugging Guide

This document is the definitive reference for diagnosing issues across the backend (Rust/Axum), frontend (Next.js), WebSocket layer, and mobile app (React Native). It covers local development setup, common failure scenarios, and how to use the built-in debug tooling.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Startup](#backend-startup)
3. [Frontend Dev Server](#frontend-dev-server)
4. [WebSocket Debugging](#websocket-debugging)
5. [Debug Endpoints (Backend)](#debug-endpoints-backend)
6. [Frontend Debug Helpers](#frontend-debug-helpers)
7. [Mobile Diagnostics](#mobile-diagnostics)
8. [Common Failure Scenarios](#common-failure-scenarios)
9. [Log Inspection](#log-inspection)
10. [Environment Variable Reference](#environment-variable-reference)

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Rust / Cargo | 1.77+ |
| Node.js | 20+ |
| SQLite | 3.40+ |
| Redis | 7.0+ (optional for local dev) |
| Docker | 24+ (for ELK / Jaeger) |

Ensure you have a local `.env` in `backend/` before starting:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set at minimum:
#   DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, APP_ENV=development
```

---

## Backend Startup

### 1. Set required env vars

```bash
# backend/.env (minimum viable local config)
APP_ENV=development
RUST_LOG=info
LOG_FORMAT=pretty
DATABASE_URL=sqlite:./stellar_insights.db
JWT_SECRET=<openssl rand -base64 48>
ENCRYPTION_KEY=<openssl rand -hex 32>
SERVER_HOST=127.0.0.1
SERVER_PORT=8080
CORS_ALLOWED_ORIGINS=http://localhost:3000
RPC_MOCK_MODE=true   # avoids hitting live Stellar nodes during dev
REDIS_URL=redis://127.0.0.1:6379
```

### 2. Run database migrations

```bash
cd backend
cargo run --bin migrate
# or, if using SQLx CLI:
sqlx migrate run --database-url sqlite:./stellar_insights.db
```

### 3. Start the server

```bash
cd backend
cargo run
# Expected output:
# INFO stellar_insights > server listening on 127.0.0.1:8080
```

### 4. Verify it's alive

```bash
curl http://localhost:8080/health
# Expected: {"status":"healthy", ...}
```

### Verbose logging

To see SQL queries and debug-level log lines:

```bash
RUST_LOG=debug,sqlx=debug cargo run
```

To enable slow-query warnings only:

```bash
DB_LOG_LEVEL=warn DB_SLOW_QUERY_MS=50 cargo run
```

### OpenTelemetry / Jaeger (optional)

```bash
# Start Jaeger (accepts OTLP HTTP on 4318, UI on http://localhost:16686)
docker run --rm -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one:latest

# Then in backend/.env:
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

---

## Frontend Dev Server

### 1. Set frontend env vars

Create `frontend/.env.local`:

```bash
# Points to the local backend
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
# Opt-in to verbose frontend logging in the browser console
NEXT_PUBLIC_ENABLE_PROD_LOGS=false   # leave false in dev; logger already verbose
```

### 2. Start the dev server

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 3. Verify the API connection

Open browser DevTools → **Network** tab. Look for XHR/Fetch calls to `localhost:8080`. A successful call to `/health` returning HTTP 200 confirms the frontend can reach the backend.

---

## WebSocket Debugging

### How the WebSocket connection works

The frontend establishes a WebSocket to `NEXT_PUBLIC_WS_URL` (default `ws://localhost:8080/ws`) on first load. Messages are parsed by `src/lib/websocket-message-parser.ts` and dispatched to registered listeners.

### Browser DevTools — Network tab

1. Open **DevTools → Network → WS** (filter by WebSocket).
2. Click on the `ws://localhost:8080/ws` row.
3. The **Messages** panel shows each frame with direction (↑ sent, ↓ received) and timestamp.

Expected message flow on connect:
```
← {"type":"connected","connectionId":"<uuid>"}
→ {"type":"ping"}
← {"type":"pong"}
← {"type":"snapshot_update", ...}
```

### Common WebSocket failures

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Connection immediately closes (code 1006) | CORS mismatch | Add `http://localhost:3000` to `CORS_ALLOWED_ORIGINS` |
| No `connected` frame received | Auth token missing | Verify `NEXT_PUBLIC_WS_URL` includes a valid token query param |
| Endless reconnect loop | Backend not running | Start the backend first; check `cargo run` output |
| `pong` never arrives | Backend WebSocket handler crashed | Check backend logs for `ERROR ws` lines |

### Console debugging

In the browser console, all WebSocket events are logged when `NODE_ENV=development`:

```js
// Filter the console to WebSocket events only:
// In DevTools console, type:
logger.websocket  // see its usages in websocket.ts
```

Or use the debug helper (see [Frontend Debug Helpers](#frontend-debug-helpers)):

```js
window.__stellarDebug.wsHealth()
// → { url: "ws://localhost:8080/ws", readyState: 1, readyStateLabel: "OPEN", ... }
```

---

## Debug Endpoints (Backend)

When `APP_ENV=development` or `APP_ENV=test`, the backend exposes `/debug/*` endpoints. These are **blocked with HTTP 403** in all other environments.

> **Security note**: The debug routes are guarded by `guard_dev_only` middleware in `backend/src/debugging/endpoints.rs`. They expose only structural configuration — never secret values (tokens, keys, passwords).

### Available endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /debug/ping` | Liveness check with current environment name |
| `GET /debug/env` | Non-sensitive environment configuration summary |
| `GET /debug/flags` | Boolean feature flag states derived from env vars |

### Usage examples

```bash
# Confirm the server is alive and debug routes are accessible
curl http://localhost:8080/debug/ping
# → {"status":"ok","environment":"development"}

# Inspect which env vars are set (no secrets exposed)
curl http://localhost:8080/debug/env | jq .
# → {"app_env":"development","rust_log":"info","redis_url_set":true, ...}

# Check which feature flags are active
curl http://localhost:8080/debug/flags | jq .
# → {"job_corridor_refresh_enabled":true,"rpc_mock_mode":true, ...}
```

### Verifying production is safe

The test suite in `backend/src/debugging/mod.rs` asserts:

- `is_dev_environment()` returns `false` for `APP_ENV=production` and `APP_ENV=staging`.
- `is_dev_environment()` returns `false` when `APP_ENV` is unset.
- `EnvSummary` struct fields contain no secret field names.

Run: `cargo test debugging` to verify.

---

## Frontend Debug Helpers

`frontend/src/lib/debug.ts` exports development-only utilities. **All functions return `null` when `NODE_ENV !== "development"`.**

### Install console helpers

Add this once in your app entrypoint (e.g. `_app.tsx`) in development:

```ts
import { installDebugConsoleHelpers } from '@/lib/debug';
// In development, attach helpers to window for DevTools access
if (process.env.NODE_ENV === 'development') {
  installDebugConsoleHelpers(wsInstance);
}
```

### Available helpers

```js
// In browser DevTools console:

// Network connectivity
window.__stellarDebug.networkState()
// → { online: true, effectiveType: "4g", downlink: 10, rtt: 50 }

// WebSocket health
window.__stellarDebug.wsHealth()
// → { url: "ws://localhost:8080/ws", readyState: 1, readyStateLabel: "OPEN" }

// Service Worker cache
window.__stellarDebug.cacheStatus()
// → Promise<{ entries: 12, estimatedBytes: 204800, cacheNames: ["sw-v1"] }>

// Full report (copy into bug report)
window.__stellarDebug.report()
// → Promise<{ timestamp, environment, network, websocket, cache, buildId }>
```

### Programmatic usage

```ts
import { getDebugReport } from '@/lib/debug';

// In a component or DevTools snippet:
const report = await getDebugReport(wsInstance);
console.log(JSON.stringify(report, null, 2));
```

---

## Mobile Diagnostics

`mobile/src/services/debugService.ts` and `mobile/src/hooks/useDebugDiagnostics.ts` provide development-only diagnostics. **All functions return `null` when `__DEV__` is `false`.**

### Using the hook in a debug screen

```tsx
import { useDebugDiagnostics } from '@hooks/useDebugDiagnostics';

export function DebugScreen() {
  const { report, queueSnapshot, isLoading, refresh } = useDebugDiagnostics();

  if (!__DEV__) return null; // never render in production

  return (
    <ScrollView>
      <Button title="Refresh" onPress={refresh} />
      {isLoading && <ActivityIndicator />}
      {report && <Text>{JSON.stringify(report, null, 2)}</Text>}
    </ScrollView>
  );
}
```

### Offline queue diagnostics

```ts
import { getOfflineQueueDiagnostics } from '@services/debugService';

// Check queue health from Flipper / Metro console
console.log(getOfflineQueueDiagnostics());
// → { totalItems: 3, pendingCount: 2, processingCount: 0, failedCount: 1, oldestItemAge: 45000 }
```

### Sync status

```ts
import { getSyncStatus } from '@services/debugService';

const status = await getSyncStatus();
// → { isOnline: true, connectionType: "wifi", isInternetReachable: true, lastCheckedAt: "..." }
```

### Full diagnostic report

```ts
import { getFullDiagnosticReport } from '@services/debugService';

const report = await getFullDiagnosticReport();
// → { timestamp, platform, isDev, offlineQueue, sync, notifications }
```

---

## Common Failure Scenarios

### Backend fails to start

**Symptom**: `cargo run` exits immediately.

1. Check `RUST_LOG=error cargo run 2>&1 | head -30` for the root cause.
2. **`DATABASE_URL` invalid**: Ensure the SQLite file path is writable and migrations have run.
3. **Port already in use**: `lsof -i :8080` — kill the conflicting process or change `SERVER_PORT`.
4. **Missing `JWT_SECRET`**: The server panics if this is absent or fewer than 32 characters.
5. **`ENCRYPTION_KEY` wrong length**: Must be exactly 64 hex characters (32 bytes).

### Frontend cannot reach the backend

**Symptom**: Network requests fail with CORS errors or `net::ERR_CONNECTION_REFUSED`.

1. Verify the backend is running: `curl http://localhost:8080/health`.
2. Check `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`.
3. Confirm `NEXT_PUBLIC_API_URL=http://localhost:8080` in `frontend/.env.local`.

### WebSocket connects but no data arrives

1. `GET /debug/flags` → confirm `job_corridor_refresh_enabled: true`.
2. Check that `RPC_MOCK_MODE=true` (for dev without live Stellar nodes) **or** that Stellar RPC URLs are reachable.
3. Look for `ERROR broadcast` lines in the backend log — this indicates a broadcast failure.

### Redis unavailable

The backend degrades gracefully without Redis (cache misses hit the DB). To silence the Redis error logs in dev:

```bash
# Start Redis in the background
docker run -d -p 6379:6379 redis:7-alpine
```

Or set `CACHE_*_TTL` values to `0` to disable caching entirely during local development.

### Mobile offline queue stuck

1. Call `getOfflineQueueDiagnostics()` from Flipper or Metro to inspect counts.
2. If `failedCount > 0`, check `lastError` on the stuck item by reading the raw queue storage key `offline-queue:v1`.
3. Trigger a retry: call `useOfflineQueue().retryFailed()`.

### Debug endpoints return 403

Ensure `APP_ENV=development` is set in `backend/.env`. The guard middleware enforces this check on every request.

---

## Log Inspection

### Backend structured logs

With `LOG_FORMAT=json` (default for Docker/CI), pipe output through `jq`:

```bash
cargo run 2>&1 | jq 'select(.level == "ERROR")'
```

With `LOG_FORMAT=pretty` (recommended for local dev):

```bash
RUST_LOG=debug LOG_FORMAT=pretty cargo run
```

### ELK Stack (optional local setup)

```bash
docker-compose -f elk/docker-compose.elk.yml up -d
# Kibana: http://localhost:5601
# Elasticsearch: http://localhost:9200
# Logstash receives logs on port 5000 when LOGSTASH_ENABLED=true
```

In `backend/.env`:

```bash
LOGSTASH_ENABLED=true
LOGSTASH_HOST=localhost:5000
KIBANA_URL=http://localhost:5601
```

### Frontend browser logs

All frontend log output goes through `src/lib/logger.ts`. In development:

- `logger.debug(...)` → `console.debug` (visible when DevTools log level includes "Verbose")
- `logger.api(...)` → logs method + URL for every API request
- `logger.websocket(...)` → logs every WebSocket frame event

Filter the console to just WebSocket events: type `WS` in the DevTools filter box.

### Mobile logs (React Native)

```bash
# iOS (Metro + device logs)
npx react-native log-ios

# Android
npx react-native log-android

# Flipper: connect to the running simulator and open the Logs plugin
```

---

## Environment Variable Reference

### Backend (key variables for debugging)

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_ENV` | — | `development` enables debug endpoints and verbose output |
| `RUST_LOG` | `info` | Log level filter (e.g. `debug`, `info`, `warn,sqlx=debug`) |
| `LOG_FORMAT` | `json` | `pretty` for human-readable local output, `json` for structured logs |
| `DATABASE_URL` | — | SQLite path or PostgreSQL DSN |
| `RPC_MOCK_MODE` | `false` | `true` skips live Stellar RPC calls during local development |
| `OTEL_ENABLED` | `false` | `true` enables OpenTelemetry trace export to Jaeger |
| `REDIS_URL` | — | Redis connection string; cache is disabled if unset |
| `CORS_ALLOWED_ORIGINS` | — | Comma-separated allowed origins; must include the frontend origin |
| `SERVER_PORT` | `8080` | Port the backend binds to |
| `RUST_BACKTRACE` | `1` | `full` for full stack traces in error output |

### Frontend (key variables for debugging)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | — | Backend base URL (e.g. `http://localhost:8080`) |
| `NEXT_PUBLIC_WS_URL` | — | WebSocket endpoint URL (e.g. `ws://localhost:8080/ws`) |
| `NEXT_PUBLIC_ENABLE_PROD_LOGS` | `false` | `true` enables verbose logging in production builds |
| `NODE_ENV` | — | `development` activates all debug helpers |

### Mobile (key variables for debugging)

| Variable / Global | Default | Purpose |
|-------------------|---------|---------|
| `__DEV__` | auto | React Native built-in; `true` in debug builds |
| `global.__DEV_LOGGING_ENABLED__` | `false` | Opt-in verbose logging in release builds (use sparingly) |
| `global.__FLIPPER__` | auto | Set by Flipper plugin; enables extended debug mode |

---

*Maintained by the Stellar Insights engineering team. File issues at the project issue tracker.*
