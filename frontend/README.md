# 🖥️ Stellar Analysis — Frontend

### _the pretty half of Stellar Analysis_ ✨

This is the dashboard. Where the backend's number-crunching finally gets to show off — corridor health, network graphs, PWA offline mode, the works.

## 🧰 Stack, at a glance

- ⚛️ **Next.js 16** + React 19 — server-rendered, fast, doesn't make you wait
- 🎨 **Tailwind 4** — styling without the ceremony
- 📊 **Recharts** + **react-force-graph-2d** — because a table of numbers is not a visualization
- 🔗 **@stellar/stellar-sdk** — talks to Stellar directly
- 🌍 **next-intl** — speaks more than one language
- 📱 **next-pwa** — installable, works offline, feels like an app
- 🧪 **Vitest** + **axe-core** — tested, and tested for accessibility too

## 🚀 Getting it running

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) and enjoy the view. 👀

## 📜 Handy scripts

| Command | What happens |
|---|---|
| `pnpm dev` | Local dev server, hot reload and all |
| `pnpm build` | Production build |
| `pnpm build:timed` | Production build, but it brags about how long it took |
| `pnpm lint` / `pnpm lint:fix` | Keeps the code tidy (or tidies it for you) |
| `pnpm lint:a11y` | Makes sure everyone can actually use this thing |
| `pnpm test` | Runs the test suite |
| `pnpm test:a11y` | Accessibility tests specifically |
| `pnpm test:contrast` | Checks your colors don't fail WCAG |
| `pnpm test:i18n` | Makes sure translations aren't missing |
| `pnpm benchmark` | Times the API, because fast is a feature |
| `pnpm analyze` | Peeks inside the bundle to see what's taking up space |

## 🗂️ Where things live

```
src/
├── app/              🧭 routes and pages (App Router)
├── components/       🧱 the building blocks
├── contexts/         🌐 shared state, React-style
├── contract_config/  📜 Soroban contract wiring
├── hooks/            🪝 reusable logic
├── i18n/             🌍 translations
├── lib/              🔧 utilities that didn't fit elsewhere
├── services/         📡 talking to the backend/chain
├── types/            🏷️ TypeScript definitions
└── utils/            🛠️ the little helpers
```

## 💡 A few things worth knowing

- Package manager is **pnpm** — please don't `npm install` your way into a lockfile fight.
- Charts render network graphs and corridor data live from the backend — if it looks empty, check the backend's actually running first.
- PWA support means it can be installed and used offline — try it, it's neat.

Built with ⚛️, 🎨, and a mild obsession with making data look good.
