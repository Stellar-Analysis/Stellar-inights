# Developer Onboarding & App Readiness Checklist

Use this checklist when setting up Stellar Insights for the first time, or to verify a clean dev
environment is ready to ship. Work through each section top-to-bottom. Every item has a clear
pass/fail command.

---

## 0. Prerequisites

| Tool | Min version | Check command |
|------|-------------|---------------|
| Git | 2.x | `git --version` |
| Rust (stable) | 1.75+ | `rustc --version` |
| Cargo | bundled with Rust | `cargo --version` |
| Node.js | 18+ | `node --version` |
| pnpm | 10+ | `pnpm --version` |
| Docker | any recent | `docker --version` |
| sqlx-cli | latest | `sqlx --version` |

Install `sqlx-cli`:
```bash
cargo install sqlx-cli --no-default-features --features postgres,sqlite
```

Install `pnpm`:
```bash
npm install -g pnpm
```

---

## 1. Repository

```bash
git clone https://github.com/Stellar-Analysis/frontend.git
cd frontend
```

- [ ] Clone succeeds without errors
- [ ] `git log --oneline -5` shows recent commits

---

## 2. Backend

### 2a. Environment

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in the required values (see [`docs/backend-environment-setup.md`](./backend-environment-setup.md)):

| Variable | Required | Note |
|----------|----------|------|
| `DATABASE_URL` | yes | `sqlite:./stellar_insights.db` for local dev |
| `JWT_SECRET` | yes | `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | yes | `openssl rand -hex 32` |
| `SEP10_SERVER_PUBLIC_KEY` | yes | Valid 56-char Stellar G-address |
| `REDIS_URL` | yes | `redis://127.0.0.1:6379` |
| `STELLAR_NETWORK` | yes | `testnet` for dev |

- [ ] `.env` exists and contains no `CHANGE_ME_` placeholders

### 2b. Services

Start Postgres (if using PostgreSQL instead of SQLite):
```bash
docker run --name stellar-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=stellar_insights \
  -p 5432:5432 -d postgres:14
```

Start Redis:
```bash
docker run --name stellar-redis -p 6379:6379 -d redis:7-alpine
```

- [ ] `docker ps` shows both containers running (or SQLite path is writable)

### 2c. Migrations

```bash
cd backend
sqlx migrate run
```

- [ ] Migrations complete with no errors
- [ ] `sqlx migrate info` shows all migrations applied

### 2d. Build & test

```bash
cd backend
cargo build 2>&1 | tail -5
```

- [ ] `cargo build` exits 0
- [ ] No `error[E...]` lines in output

```bash
cargo test --lib 2>&1 | tail -10
```

- [ ] `test result: ok` in output

### 2e. Startup smoke test

```bash
bash backend/scripts/smoke-test.sh
```

- [ ] Script exits 0
- [ ] Output shows `[PASS] backend smoke test`

---

## 3. Frontend

### 3a. Environment

```bash
cd frontend
cp .env.example .env.local   # if .env.example exists, otherwise create manually
```

Minimum variables for local dev:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

- [ ] `.env.local` exists

### 3b. Install dependencies

```bash
cd frontend
pnpm install
```

- [ ] `pnpm install` exits 0 with no unresolved peer dependencies

### 3c. Lint

```bash
cd frontend
pnpm lint
```

- [ ] No ESLint errors (warnings are acceptable)

### 3d. Type check

```bash
cd frontend
pnpm exec tsc --noEmit
```

- [ ] TypeScript reports 0 errors

### 3e. Unit tests

```bash
cd frontend
pnpm test -- --run
```

- [ ] All tests pass

### 3f. Build

```bash
cd frontend
pnpm build
```

- [ ] Build exits 0
- [ ] `.next/` directory is created

### 3g. Dev server smoke test

```bash
bash frontend/scripts/smoke-test.sh
```

- [ ] Script exits 0
- [ ] Output shows `[PASS] frontend smoke test`

---

## 4. Mobile

### 4a. Environment

```bash
cd mobile
cp .env.example .env
```

| Variable | Value for dev |
|----------|---------------|
| `API_BASE_URL` | `http://localhost:8080` |
| `STELLAR_NETWORK` | `testnet` |

- [ ] `.env` exists

### 4b. Install dependencies

```bash
cd mobile
npm install
```

- [ ] `npm install` exits 0

### 4c. iOS pods (macOS only)

```bash
cd mobile/ios
pod install
cd ../..
```

- [ ] `pod install` completes (skip on Linux/Windows)

### 4d. Type check

```bash
cd mobile
npm run type-check
```

- [ ] TypeScript reports 0 errors

### 4e. Lint

```bash
cd mobile
npm run lint
```

- [ ] No lint errors

### 4f. Unit tests

```bash
cd mobile
npm test -- --passWithNoTests
```

- [ ] Jest exits 0

### 4g. Build readiness smoke test

```bash
bash mobile/scripts/smoke-test.sh
```

- [ ] Script exits 0
- [ ] Output shows `[PASS] mobile smoke test`

---

## 5. Contracts (optional)

Only needed if you are working on Soroban contracts.

```bash
# Install Stellar CLI if not already present
cargo install --locked stellar-cli

cd contracts
cargo build --target wasm32-unknown-unknown --release 2>&1 | tail -5
```

- [ ] All contract crates compile to WASM
- [ ] No clippy `unwrap_used` / `expect_used` / `panic` violations:
  ```bash
  cargo clippy --target wasm32-unknown-unknown -- -D warnings
  ```

---

## 6. Full cross-platform smoke test

Run all smoke tests from a single command at the repo root:

```bash
bash scripts/smoke-test-all.sh
```

Expected output:
```
[PASS] backend smoke test
[PASS] frontend smoke test
[PASS] mobile smoke test
[SUMMARY] 3/3 checks passed
```

- [ ] All three pass
- [ ] Exit code is 0

---

## 7. Git hygiene

- [ ] No secrets in tracked files: `git diff --cached` shows no `.env` files
- [ ] `.gitignore` covers `.env`, `.env.local`, `target/`, `.next/`, `node_modules/`
- [ ] Pre-commit hooks are active: `ls .husky/` (frontend) shows hook files

---

## 8. Readiness gates summary

| Gate | Command | Pass condition |
|------|---------|----------------|
| Backend compiles | `cargo build` | Exit 0 |
| Backend unit tests | `cargo test --lib` | `test result: ok` |
| Backend starts | `smoke-test.sh` | HTTP 200 on `/health` |
| Frontend lint | `pnpm lint` | 0 errors |
| Frontend type check | `tsc --noEmit` | 0 errors |
| Frontend tests | `pnpm test -- --run` | All pass |
| Frontend builds | `pnpm build` | Exit 0 |
| Frontend starts | `smoke-test.sh` | HTTP 200 on `/` |
| Mobile type check | `npm run type-check` | 0 errors |
| Mobile tests | `npm test` | Jest exit 0 |
| Mobile build ready | `smoke-test.sh` | Dependencies + config valid |

All gates green = app is development ready.

---

## Troubleshooting quick reference

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `CHANGE_ME_` rejection on backend start | `.env` not filled in | Edit `backend/.env` |
| `sqlx: no such table` | Migrations not run | `sqlx migrate run` |
| `pnpm: command not found` | pnpm not installed | `npm install -g pnpm` |
| `pod install` fails | CocoaPods outdated | `gem install cocoapods` |
| Redis connection refused | Redis not running | `docker start stellar-redis` |
| Port 8080 already in use | Another process | `lsof -i :8080` then kill or change `SERVER_PORT` |
| Next.js build type errors | Outdated deps | `pnpm install` then retry |
