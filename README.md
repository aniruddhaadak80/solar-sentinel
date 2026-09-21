<div align="center">

# ☀️ Solar Sentinel

**Watch solar storms hit Earth live — risk engine, 3D planet, agent tools, verifiable seals.**

[![Live Demo](https://img.shields.io/badge/demo-live-22d3ee?style=for-the-badge)](https://solar-sentinel-vert.vercel.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-34d399?style=for-the-badge)](./LICENSE)
[![Next.js](https://img.shields.io/badge/next.js-16-ffffff?style=for-the-badge)](https://nextjs.org/)
[![Feeds: NOAA + NASA](https://img.shields.io/badge/feeds-NOAA_%2B_NASA-fbbf24?style=for-the-badge)](https://www.swpc.noaa.gov/)
[![MCP ready](https://img.shields.io/badge/MCP-tools-34d399?style=for-the-badge)](./public/mcp.json)
[![CI](https://img.shields.io/badge/ci-passing-34d399?style=for-the-badge)](./.github/workflows/ci.yml)

[Live App](https://solar-sentinel-vert.vercel.app) · [API](https://solar-sentinel-vert.vercel.app/api/health) · [MCP](https://solar-sentinel-vert.vercel.app/api/mcp) · [Issues](https://github.com/aniruddhaadak80/solar-sentinel/issues)

</div>

> Solar-max 2025–2026 is firing X-flares at Earth right now. Solar Sentinel streams
> **NOAA solar-wind + Kp** and **NASA DONKI flares** into one deterministic risk score,
> paints it on a rotating 3D planet, seals every record with a hash chain,
> and hands the whole thing to coding agents as **MCP tools** — no API keys, offline-safe.

## ✨ Features

- 🛰️ **3 live feeds, zero keys** — NOAA plasma/mag, NOAA planetary K-index, NASA DONKI flares (cached API routes + sealed fallbacks)
- 🧮 **Deterministic risk engine** — 0–100 score with itemized factors; the *same function* powers UI, REST and MCP
- 🌍 **Library-grade 3D globe** — `react-globe.gl` aurora ovals, storm arcs, pulse rings driven by live Kp
- 🤖 **MCP agent interface** — JSON-RPC `initialize` / `tools/list` / `tools/call` + one-click in-page console
- ⛓️ **Hash-chained seals** — `SHA-384(prevSeal ‖ canonicalJson)` on every assessment, verifiable by replay
- 🎨 **Dark-first design system** — glass panels, ticker, stats row, `01–05` narrative, custom scrollbar

### System architecture

```mermaid
flowchart LR
    A[NOAA SWPC feeds]:::live --> E[Next.js API routes<br/>revalidate cache]:::live
    B[NASA DONKI flares]:::warn --> E
    E --> F[Risk engine<br/>0-100 + factors]:::ai
    F --> G[SHA-384 seal chain]:::agent
    F --> H[3D globe<br/>react-globe.gl]:::live
    F --> I[MCP JSON-RPC<br/>5 tools]:::agent
    G --> J[Dashboard UI]:::infra
    H --> J
    I --> J
    classDef live fill:#22d3ee,color:#04060c;
    classDef ai fill:#a78bfa,color:#04060c;
    classDef agent fill:#34d399,color:#04060c;
    classDef warn fill:#fbbf24,color:#04060c;
    classDef infra fill:#94a3b8,color:#04060c;
```

## 📡 Live data pipeline

Two NOAA streams plus NASA flares, normalized to typed records, cached at the edge, never breaking offline.

```mermaid
flowchart TB
    S1[RTSW wind 1-min<br/>SOLAR-1 primary]:::live --> N[Normalizer<br/>src/lib/feeds.ts]:::live
    S2[RTSW mag 1-min]:::live --> N
    S3[SWPC planetary K-index]:::live --> K[KP parser]:::live
    S4[NASA DONKI FLR<br/>DEMO_KEY]:::warn --> N
    N --> C{Fetch OK?}:::warn
    C -->|yes| R[Edge cache<br/>5–30 min]:::live
    C -->|no| F[Sealed fallback<br/>src/lib/fallback.ts]:::risk
    R --> UI[Feeds + engine]:::ai
    F --> UI
    classDef live fill:#22d3ee,color:#04060c;
    classDef ai fill:#a78bfa,color:#04060c;
    classDef warn fill:#fbbf24,color:#04060c;
    classDef risk fill:#fb7185,color:#04060c;
```

## 🧮 Engine flow

Weights sum to 100 — Kp 35, wind speed 20, Bz southward 20, flare 15, density 10.

```mermaid
flowchart LR
    I1[Kp / 9]:::live --> W[Kp × 35]:::ai
    I2[Wind speed]:::live --> W2[Speed × 20]:::ai
    I3[IMF Bz south]:::live --> W3[Bz × 20]:::ai
    I4[Flare class]:::warn --> W4[Flare × 15]:::ai
    I5[Density]:::live --> W5[Density × 10]:::ai
    W --> S[Score 0-100]:::agent
    W2 --> S
    W3 --> S
    W4 --> S
    W5 --> S
    S --> L{Level}:::risk
    L --> G[Guidance + impacts]:::infra
    classDef live fill:#22d3ee,color:#04060c;
    classDef ai fill:#a78bfa,color:#04060c;
    classDef agent fill:#34d399,color:#04060c;
    classDef warn fill:#fbbf24,color:#04060c;
    classDef risk fill:#fb7185,color:#04060c;
    classDef infra fill:#94a3b8,color:#04060c;
```

## 🤖 Agent (MCP) sequence

```mermaid
sequenceDiagram
    participant Agent as AI agent
    participant MCP as POST /api/mcp
    participant Eng as Risk engine
    participant Feed as Feed cache
    Agent->>MCP: initialize
    MCP-->>Agent: protocolVersion + tools caps
    Agent->>MCP: tools/list
    MCP-->>Agent: 5 tools
    Agent->>MCP: tools/call assess_geomagnetic_risk
    MCP->>Eng: assessRisk(inputs)
    Eng-->>MCP: score + factors
    MCP->>Feed: sealRecord(assessment)
    MCP-->>Agent: assessment + SHA-384 seal
```

## ⛓️ Integrity / seal chain

```mermaid
flowchart TB
    R1[Assessment N<br/>score + factors]:::ai --> C1[canonicalJson<br/>sorted keys]:::infra
    P1[prevSeal N-1]:::agent --> H1[SHA-384<br/>prev + canonical]:::agent
    C1 --> H1
    H1 --> S1[seal N]:::agent
    S1 --> P2[prevSeal N]:::agent
    R2[Assessment N+1]:::ai --> H2[SHA-384 replay]:::agent
    P2 --> H2
    H2 --> V{match?}:::warn
    V -->|yes| OK[Verified]:::agent
    V -->|no| BAD[Tampered]:::risk
    classDef ai fill:#a78bfa,color:#04060c;
    classDef agent fill:#34d399,color:#04060c;
    classDef warn fill:#fbbf24,color:#04060c;
    classDef risk fill:#fb7185,color:#04060c;
    classDef infra fill:#94a3b8,color:#04060c;
```

## 🚀 Quickstart

```bash
git clone https://github.com/aniruddhaadak80/solar-sentinel.git
cd solar-sentinel
npm ci
npm run dev
```

Zero env vars. Open http://localhost:3000 — if NOAA/NASA are unreachable you get sealed samples, clearly badged.

## 🔌 API

```bash
curl https://solar-sentinel-vert.vercel.app/api/health
curl https://solar-sentinel-vert.vercel.app/api/kp
curl https://solar-sentinel-vert.vercel.app/api/solar-wind
curl https://solar-sentinel-vert.vercel.app/api/flares
curl https://solar-sentinel-vert.vercel.app/api/risk
curl -X POST https://solar-sentinel-vert.vercel.app/api/risk \
  -H 'Content-Type: application/json' \
  -d '{"kp":6.2,"solarWindSpeed":610,"density":12,"bzGsm":-11,"maxFlareClass":"M4.2"}'
curl -X POST https://solar-sentinel-vert.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Agent setup (`mcp.json`)

```json
{
  "mcpServers": {
    "solar-sentinel": { "url": "https://solar-sentinel-vert.vercel.app/api/mcp" }
  }
}
```

Tools: `get_kp_index` · `get_solar_wind` · `get_flares` · `assess_geomagnetic_risk` · `verify_seal_chain`.
Full copy-paste manifest lives in [`public/mcp.json`](./public/mcp.json).

## 🧭 User journey

```mermaid
flowchart LR
    L[Land on hero<br/>live badge]:::live --> T[Ticker + stats<br/>10-sec wow]:::live
    T --> E[Engine section<br/>factor bars]:::ai
    E --> P[Grab the planet<br/>arcs + aurora]:::ai
    P --> M[Run MCP console<br/>one click]:::agent
    M --> S[Star + fork]:::warn
    classDef live fill:#22d3ee,color:#04060c;
    classDef ai fill:#a78bfa,color:#04060c;
    classDef agent fill:#34d399,color:#04060c;
    classDef warn fill:#fbbf24,color:#04060c;
```

## 🏭 Deployment pipeline

```mermaid
flowchart TB
    C[Push to main]:::infra --> CI[GitHub Actions<br/>node 22 · lint · build]:::infra
    CI -->|green| GH[Public repo<br/>topics + homepage]:::live
    CI -->|green| V[Vercel --prod]:::live
    V --> H[GET /api/health]:::agent
    H --> F[Feed checks<br/>count > 0]:::ai
    F --> M[MCP tools/list]:::agent
    M --> R[Risk score + seal]:::warn
    classDef live fill:#22d3ee,color:#04060c;
    classDef ai fill:#a78bfa,color:#04060c;
    classDef agent fill:#34d399,color:#04060c;
    classDef warn fill:#fbbf24,color:#04060c;
    classDef infra fill:#94a3b8,color:#04060c;
```

## 📁 Project map

```text
src/
  app/
    page.tsx              # 01–05 narrative (server, cached 5 min)
    layout.tsx            # full SEO / OG / Twitter metadata
    api/
      health/route.ts     # liveness
      solar-wind/route.ts # NOAA plasma+mag (revalidate 5 min)
      kp/route.ts         # NOAA K-index (revalidate 5 min)
      flares/route.ts     # NASA DONKI (revalidate 30 min)
      risk/route.ts       # GET live sealed score · POST custom inputs
      mcp/route.ts        # JSON-RPC initialize / tools/list / tools/call
  lib/
    types.ts engine.ts feeds.ts seal.ts fallback.ts
  components/
    GlobeLoader.tsx       # client wrapper (next/dynamic ssr:false lives here)
    GlobeView.tsx         # react-globe.gl + 2D fallback only on load failure
    McpConsole.tsx Ticker.tsx Reveal.tsx
public/mcp.json           # agent manifest
```

## 🗺️ Roadmap

### Now — deepen the live picture

- [ ] Aurora-viewline map layer so users see *where* aurora is visible tonight — wow: personal "go outside" moment
- [ ] G-scale alert banner pinned to hero when Kp ≥ 5 — wow: the site reacts to the Sun
- [ ] Flare-class timeline scrubber — wow: replay the last 14 days of the Sun

```mermaid
flowchart LR
    A[Aurora viewline]:::live --> B[Alert banner]:::risk
    B --> C[Flare scrubber]:::warn
    C --> D[Shareable storm card]:::agent
    classDef live fill:#22d3ee,color:#04060c;
    classDef risk fill:#fb7185,color:#04060c;
    classDef warn fill:#fbbf24,color:#04060c;
    classDef agent fill:#34d399,color:#04060c;
```

### Next — agent ecosystem

- [ ] Submit to MCP directories (Glama, Smithery) — wow: installs from agent app stores
- [ ] Webhook subscriptions for G1+ onsets — wow: agents wake up when storms start
- [ ] Signed seal registry endpoint — wow: third parties verify scores without trusting us

```mermaid
flowchart TB
    D[Directory listings]:::agent --> W[Webhooks]:::live
    W --> R[Seal registry]:::ai
    R --> E[Ecosystem]:::warn
    classDef live fill:#22d3ee,color:#04060c;
    classDef ai fill:#a78bfa,color:#04060c;
    classDef agent fill:#34d399,color:#04060c;
    classDef warn fill:#fbbf24,color:#04060c;
```

### Later — prediction + community

- [ ] 30-min Kp nowcast from solar-wind lead time — wow: forecast, not just observation
- [ ] Crowd aurora sightings vs model overlay — wow: humans close the loop
- [ ] Multi-language briefings for grid operators — wow: real-world ops use

```mermaid
flowchart LR
    N[Kp nowcast]:::ai --> S[Sightings overlay]:::live
    S --> B[Ops briefings]:::warn
    B --> O[Community]:::agent
    classDef live fill:#22d3ee,color:#04060c;
    classDef ai fill:#a78bfa,color:#04060c;
    classDef agent fill:#34d399,color:#04060c;
    classDef warn fill:#fbbf24,color:#04060c;
```

## ⚠️ Safety disclaimer

Space weather can affect power grids, aviation, GPS and communications.
This project is **informational and educational** — it is not an official alert source
and must not drive safety-critical decisions. Always confirm with
[NOAA SWPC](https://www.swpc.noaa.gov/) during active storms.

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) — zero-env quickstart, engine rules, PR hygiene.
Security reports: [SECURITY.md](./SECURITY.md). License: **MIT** ([LICENSE](./LICENSE)).

### Attribution

- Solar wind & K-index: [NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/)
- Flares: [NASA DONKI](https://api.nasa.gov/) via `DEMO_KEY`
- Globe: [react-globe.gl](https://github.com/vasturiano/react-globe.gl) · 3D: [three.js](https://threejs.org/)
