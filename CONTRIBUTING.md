# Contributing to Solar Sentinel

Thanks for your interest! This repo follows a lightweight, star-friendly workflow.

## Quickstart

```bash
npm ci
npm run dev
```

Zero env vars required — every feed has a sealed offline fallback.

## Ground rules

- Keep the risk engine deterministic and explainable (`src/lib/engine.ts` is shared by UI, REST and MCP — don't fork it).
- New feeds go through `src/lib/feeds.ts` with an offline sample in `src/lib/fallback.ts`.
- `npm run lint` and `npm run build` must pass before pushing.
- Small, focused PRs with a before/after screenshot for UI changes.

## Reporting issues

Open an issue with: what you saw, what you expected, the endpoint (`/api/health`, `/api/risk`, …) and whether fallbacks were active.
