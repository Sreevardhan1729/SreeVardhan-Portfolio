# Portfolio Lab

The portfolio of Sree Vardhan Reddy, a software engineer who builds React and TypeScript product features and the Go and Python data systems behind them.

Instead of screenshots, the page runs my own systems in the browser:

- **ForgeDB terminal.** [ForgeDB](https://github.com/Sreevardhan1729/ForgeDB), my Redis-compatible database in C++, is compiled to WebAssembly with Emscripten. Commands typed in the hero terminal go through ForgeDB's real RESP parser, dispatcher and serializer. An append-only log panel shows the writes its dispatcher would persist.
- **Gateway simulation.** The load balancer (smooth weighted round-robin and circuit breaker), token-bucket rate limiter and priority queue from my [AI Inference Gateway](https://github.com/Sreevardhan1729/ai-inference-gateway) are compiled unchanged to WebAssembly with TinyGo. You can fail a backend, watch its breaker open, burst one API key into 429s, or overload the queue until it sheds batch traffic first.
- **Trace waterfall.** My DevRev internship is drawn like a trace viewer, with each piece of work as a span positioned by the dates of its merged PRs.

Everything is static and runs on Vercel's free plan. There are no server functions; the contact form posts to Formspree.

## How it's built

- **Stack:** Next.js 16 (App Router, every route prerendered), React 19, TypeScript, Tailwind CSS 4.
- **Motion:** CSS scroll-driven animations for reveals and View Transitions for the theme switch. Both are turned off under `prefers-reduced-motion`.
- **Content:** all copy lives in `lib/portfolio-data.ts`.
- **WASM:** `scripts/build-wasm.sh` builds both modules from the commits pinned in `wasm/sources.json`. The output in `public/wasm/` is committed, so the Vercel build only runs `next build`.
  - The C++ shim is in `wasm/forgedb/`.
  - The Go bridge is in `wasm/gateway/`. The three gateway files there are byte-for-byte copies of the pinned commit, and the script fails if they drift.
- **Loading:** neither module is requested before the page's load event. ForgeDB loads when the browser is idle. The gateway loads only when you scroll near it. If a module can't load, a recorded session or the static request path stays in place.

## Running locally

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Checks:

```bash
pnpm test           # unit tests (Vitest), including the real ForgeDB module
pnpm typecheck
pnpm lint
pnpm e2e            # Playwright, desktop and 375px mobile, against a production build
pnpm check:budgets  # after pnpm build: first-load JS and WASM sizes
pnpm check:lighthouse   # with `pnpm start -p 3100` running
cd wasm/gateway && go test -race ./gateway/
```

Rebuilding the WebAssembly needs Emscripten (`em++`) and TinyGo, or Go as a fallback, on your machine:

```bash
pnpm build:wasm     # or: pnpm build:wasm forgedb | gateway
```
