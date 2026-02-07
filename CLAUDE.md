# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start Vite dev server with HMR (rolldown-vite)
npm run build    # TypeScript compile + Vite production build
npm run lint     # Run ESLint on all TypeScript files
npm run preview  # Preview production build locally
```

No test framework is configured. There are no test commands.

## Architecture

Single-component React 19 + TypeScript app. All application logic lives in `src/App.tsx` — there are no routers, state libraries, or component hierarchy.

**Data flow:** Three CoinGecko API fetch functions run on mount via `useEffect`:
- `fetchEthPrice()` — current price + 24h change, auto-refreshes every 15 seconds via `setInterval`
- `fetchChartData()` — short-term price series (24h/7d/30d), re-fetches when `timeframe` state changes
- `fetchHistoricalData()` — 10-year history (3650 days), fetched once and downsampled to ~120 points

**Charts:** Two distinct chart implementations:
- Short-term chart: hand-built SVG `<polyline>` that normalizes data points to a 100x50 viewBox
- Historical chart: Recharts `<LineChart>` with `<ResponsiveContainer>`

**Styling:** Plain CSS split across `src/index.css` (global resets/fonts) and `src/App.css` (component styles). Dark theme with gradient backgrounds.

## API

All data comes from CoinGecko's public API (no auth key). Rate limits apply — the free tier allows ~10-30 calls/minute. The 15-second refresh interval for current price is the main rate limit concern.
