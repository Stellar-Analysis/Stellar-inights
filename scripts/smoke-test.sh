#!/usr/bin/env bash
# Frontend smoke test
# Verifies: node/pnpm present, dependencies installed, lint clean, type check passes,
#           build succeeds, and dev server responds (if already running).
# Usage: bash frontend/scripts/smoke-test.sh
# Exit 0 = pass, exit 1 = fail

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PASS=0
FAIL=0

ok()   { echo "[PASS] $*"; PASS=$((PASS+1)); }
fail() { echo "[FAIL] $*"; FAIL=$((FAIL+1)); }
info() { echo "[INFO] $*"; }

# ── 1. Node.js version ────────────────────────────────────────────────────────
if command -v node &>/dev/null; then
  NODE_VER=$(node --version | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    ok "node $(node --version) (>= 18 required)"
  else
    fail "node version too old: $(node --version) — need >= 18"
  fi
else
  fail "node not found — install from https://nodejs.org"
fi

# ── 2. pnpm present ───────────────────────────────────────────────────────────
if command -v pnpm &>/dev/null; then
  ok "pnpm found: $(pnpm --version)"
else
  fail "pnpm not found — run: npm install -g pnpm"
fi

# ── 3. node_modules installed ────────────────────────────────────────────────
if [[ -d "$FRONTEND_DIR/node_modules" ]]; then
  ok "node_modules directory exists"
else
  fail "node_modules missing — run: pnpm install in frontend/"
fi

# ── 4. Environment file ───────────────────────────────────────────────────────
if [[ -f "$FRONTEND_DIR/.env.local" ]] || [[ -f "$FRONTEND_DIR/.env" ]]; then
  ok ".env file exists"
else
  fail ".env.local not found — create frontend/.env.local with NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL"
fi

# ── 5. TypeScript type check ──────────────────────────────────────────────────
info "Running tsc --noEmit…"
if (cd "$FRONTEND_DIR" && pnpm exec tsc --noEmit 2>&1); then
  ok "TypeScript type check passed"
else
  fail "TypeScript errors found — run 'pnpm exec tsc --noEmit' in frontend/ for details"
fi

# ── 6. ESLint ─────────────────────────────────────────────────────────────────
info "Running ESLint…"
if (cd "$FRONTEND_DIR" && pnpm lint 2>&1); then
  ok "ESLint passed"
else
  fail "ESLint errors found — run 'pnpm lint' in frontend/ for details"
fi

# ── 7. Unit tests ─────────────────────────────────────────────────────────────
info "Running unit tests (vitest --run)…"
if (cd "$FRONTEND_DIR" && pnpm test -- --run 2>&1); then
  ok "unit tests passed"
else
  fail "unit tests failed — run 'pnpm test -- --run' in frontend/ for details"
fi

# ── 8. Production build ───────────────────────────────────────────────────────
info "Running next build…"
if (cd "$FRONTEND_DIR" && pnpm build 2>&1); then
  ok "production build succeeded"
else
  fail "production build failed — run 'pnpm build' in frontend/ for details"
fi

# ── 9. Dev server health check (if already running) ──────────────────────────
DEV_URL="http://localhost:3000"
info "Probing $DEV_URL (skipped if dev server not running)…"
if command -v curl &>/dev/null; then
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$DEV_URL" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    ok "dev server responded HTTP 200 at $DEV_URL"
  elif [[ "$HTTP_STATUS" == "000" ]]; then
    info "dev server not running — start with 'pnpm dev' to verify"
  else
    fail "dev server returned HTTP $HTTP_STATUS at $DEV_URL (expected 200)"
  fi
else
  info "curl not found — skipping live dev server check"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────"
echo "Frontend smoke test: $PASS passed, $FAIL failed"
echo "────────────────────────────────────────"

if [[ $FAIL -eq 0 ]]; then
  echo "[PASS] frontend smoke test"
  exit 0
else
  echo "[FAIL] frontend smoke test — fix the issues above and re-run"
  exit 1
fi
