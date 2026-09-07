# 🌌 Stellar Insights

### _brought to you by Stellar Analysis_ ✨

> Payments on the Stellar network happen in the blink of an eye. This is how we watch them happen — in real time, with charts that don't lie and a backend that doesn't sleep. 🛰️

Think of it as mission control for cross-border payments: we ingest the ledger, crunch the numbers, and hand you a dashboard that actually tells you something.

## 🧩 What's under the hood

| Piece | What it does | Built with |
|---|---|---|
| ⚙️ `backend/` | Chews through Stellar ledger data and serves it back up hot | Rust |
| 🖥️ `frontend/` | The dashboard you actually look at | Next.js |
| 📜 `contracts/` | On-chain logic, for when off-chain isn't trustless enough | Soroban |
| 🗄️ Database | Where all those numbers go to rest | PostgreSQL |

## 🚀 Quick start (from zero to dashboard)

**1. Wake up a Postgres instance**

```bash
docker run --name stellar-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=stellar_insights -p 5432:5432 -d postgres:14
```

**2. Fire up the backend** 🔥

```bash
cd backend
cp .env.example .env
# fill in DATABASE_URL, STELLAR_RPC_URL, etc. — the backend will yell at you if you forget
cargo run
```

**3. Bring the dashboard to life** 🎨

```bash
cd frontend
pnpm install
pnpm dev
```

Open it up, watch the numbers move. That's it — you're now watching the Stellar network breathe. 🫁

## 🛡️ Local safety checks (already built, no assembly required)

- `scripts/check_folder_size.sh` — the bouncer that stops any folder from sneaking past 200MB
- [`.github/workflows/enforce-folder-size.yml`](.github/workflows/enforce-folder-size.yml) — same bouncer, but for CI

## 🗺️ Lay of the land

```
backend/     ⚙️  Rust services — the engine room
frontend/    🖥️  Next.js dashboard — the pretty part
mobile/      📱  React Native app — Stellar Insights in your pocket
contracts/   📜  Soroban contracts — trust, but verify on-chain
docs/        📚  Everything we wrote down so you don't have to ask
```

## 📌 Good to know

- Repo history has been trimmed down so cloning doesn't take a coffee break.
- Big binaries live in `git lfs`, not in your `git log`.
- For the deep-dive stuff — architecture, deployment, "why did we do it this way" — check `docs/` and the READMEs living inside each folder.

Made with 🦀, ☕, and an unreasonable love for clean ledgers.
