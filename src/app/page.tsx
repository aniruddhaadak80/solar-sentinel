import { Activity, Atom, Radio, Satellite, ShieldCheck, Star } from "lucide-react";
import { assessRisk } from "@/lib/engine";
import { getFlares, getKp, getSolarWind } from "@/lib/feeds";
import { sealRecord, windowSealId } from "@/lib/seal";
import GlobeLoader from "@/components/GlobeLoader";
import McpConsole from "@/components/McpConsole";
import Reveal from "@/components/Reveal";
import Ticker from "@/components/Ticker";

export const revalidate = 300;

function levelColor(level: string): string {
  switch (level) {
    case "EXTREME": return "text-rose-300 border-rose-400/40 bg-rose-500/10";
    case "SEVERE": return "text-orange-300 border-orange-400/40 bg-orange-500/10";
    case "HIGH": return "text-amber-300 border-amber-400/40 bg-amber-500/10";
    case "ELEVATED": return "text-violet-300 border-violet-400/40 bg-violet-500/10";
    default: return "text-emerald-300 border-emerald-400/40 bg-emerald-500/10";
  }
}

function strongest(classes: string[]): string {
  const rank = (c: string) => ({ A: 0, B: 1, C: 2, M: 3, X: 4 })[c.charAt(0).toUpperCase() as "A"] ?? -1;
  let best = "—";
  for (const c of classes) if (rank(c) > rank(best)) best = c;
  return best;
}

export default async function Home() {
  const [wind, kp, flares] = await Promise.all([getSolarWind(), getKp(), getFlares()]);
  const latestWind = wind.data[wind.data.length - 1];
  const latestKp = kp.data[kp.data.length - 1];
  const topFlare = strongest(flares.data.map((f) => f.classType));
  const assessment = assessRisk({
    kp: latestKp.kp,
    solarWindSpeed: latestWind.speed,
    density: latestWind.density,
    bzGsm: latestWind.bzGsm,
    maxFlareClass: topFlare,
  });
  const seal = sealRecord(assessment, windowSealId([...wind.data.map((w) => w.time), ...kp.data.map((k) => k.time)]));
  const anyFallback = wind.fallback || kp.fallback || flares.fallback;

  const tickerItems = [
    `Kp ${latestKp.kp.toFixed(1)}`,
    `solar wind ${Math.round(latestWind.speed)} km/s`,
    `Bz ${latestWind.bzGsm.toFixed(1)} nT`,
    `density ${latestWind.density.toFixed(1)} p/cm³`,
    `top flare ${topFlare}`,
    `risk ${assessment.score}/100 ${assessment.level}`,
  ];

  return (
    <div className="bg-scene flex min-h-full flex-col">
      {/* NAV */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <Atom className="h-5 w-5 text-cyan-300" />
          <span className="font-mono text-sm tracking-widest text-slate-200">SOLAR·SENTINEL</span>
        </div>
        <nav className="flex items-center gap-4 font-mono text-xs text-slate-400">
          <a href="#live" className="hover:text-cyan-300">LIVE</a>
          <a href="#engine" className="hover:text-cyan-300">ENGINE</a>
          <a href="#planet" className="hover:text-cyan-300">PLANET</a>
          <a href="#agents" className="hover:text-cyan-300">MCP</a>
          <a href="/api/health" className="rounded-full border border-white/15 px-3 py-1 hover:border-cyan-300/50 hover:text-cyan-200">API</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-8 pt-10 text-center md:pt-16">
        <Reveal>
          <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-mono text-[11px] text-slate-300">
            <span className={`ping-dot relative inline-block h-2 w-2 rounded-full ${anyFallback ? "bg-amber-300 text-amber-300" : "bg-emerald-300 text-emerald-300"}`} />
            {anyFallback ? "OFFLINE SAMPLES — feeds unreachable, sealed fallbacks active" : "LIVE — NOAA + NASA feeds streaming"}
          </div>
          <h1 className="display-font mx-auto max-w-4xl text-5xl font-extrabold leading-[1.02] text-white md:text-7xl">
            Watch solar storms<br />hit <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-rose-300 bg-clip-text text-transparent">Earth live.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-400 md:text-lg">
            Live Kp, solar wind and flare feeds feed a deterministic storm-risk engine —
            sealed, explainable, and usable by AI agents as MCP tools.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href="#planet" className="rounded-full bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-[#04060c] transition hover:bg-cyan-300">See the planet</a>
            <a href="#agents" className="rounded-full border border-white/20 px-6 py-2.5 text-sm text-slate-200 transition hover:border-emerald-300/60 hover:text-emerald-200">Use as an agent tool</a>
          </div>
        </Reveal>

        {/* STATS */}
        <Reveal delay={0.15}>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "GEOMAGNETIC RISK", value: `${assessment.score}/100`, sub: assessment.level },
              { label: "PLANETARY K-INDEX", value: latestKp.kp.toFixed(1), sub: `a-running ${Math.round(latestKp.aRunning)}` },
              { label: "SOLAR WIND", value: `${Math.round(latestWind.speed)} km/s`, sub: `Bz ${latestWind.bzGsm.toFixed(1)} nT` },
              { label: "TOP FLARE (14d)", value: topFlare, sub: `${flares.count} events tracked` },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl border border-white/10 p-4">
                <div className="font-mono text-[10px] tracking-widest text-slate-500">{s.label}</div>
                <div className="display-font mt-1 text-2xl font-bold text-white">{s.value}</div>
                <div className="mt-0.5 font-mono text-[11px] text-cyan-300/90">{s.sub}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <Ticker items={tickerItems} />

      {/* 01 LIVE */}
      <section id="live" className="mx-auto w-full max-w-6xl px-5 py-14">
        <Reveal>
          <div className="font-mono text-xs tracking-widest text-cyan-300">01 — LIVE</div>
          <h2 className="display-font mt-2 text-3xl font-bold text-white md:text-4xl">Three public feeds. Zero keys.</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">NOAA solar wind, NOAA planetary K-index, NASA DONKI flares — normalized, cached, with sealed offline fallbacks.</p>
        </Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Reveal delay={0.05}>
            <div className="glass h-full rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 font-mono text-xs text-cyan-300"><Radio className="h-4 w-4" /> SOLAR WIND · NOAA {wind.fallback && <span className="text-amber-300">[fallback]</span>}</div>
              <div className="display-font mt-2 text-4xl font-bold text-white">{Math.round(latestWind.speed)}<span className="text-base font-normal text-slate-400"> km/s</span></div>
              <div className="mt-3 space-y-1 font-mono text-[11px] text-slate-400">
                {wind.data.slice(-5).map((w) => (
                  <div key={w.time} className="flex justify-between border-b border-white/5 pb-1">
                    <span>{w.time.slice(5, 16).replace("T", " ")}</span>
                    <span className="text-slate-200">{Math.round(w.speed)} km/s · {w.density.toFixed(1)} p/cm³ · Bz {w.bzGsm.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <a href="/api/solar-wind" className="mt-3 inline-block font-mono text-[11px] text-cyan-300 hover:underline">GET /api/solar-wind →</a>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="glass h-full rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 font-mono text-xs text-violet-300"><Activity className="h-4 w-4" /> K-INDEX · NOAA {kp.fallback && <span className="text-amber-300">[fallback]</span>}</div>
              <div className="display-font mt-2 text-4xl font-bold text-white">{latestKp.kp.toFixed(1)}<span className="text-base font-normal text-slate-400"> / 9</span></div>
              <div className="mt-3 space-y-1 font-mono text-[11px] text-slate-400">
                {kp.data.slice(-5).map((k) => (
                  <div key={k.time} className="flex justify-between border-b border-white/5 pb-1">
                    <span>{k.time.slice(5, 16).replace("T", " ")}</span>
                    <span className="text-slate-200">Kp {k.kp.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <a href="/api/kp" className="mt-3 inline-block font-mono text-[11px] text-violet-300 hover:underline">GET /api/kp →</a>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="glass h-full rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 font-mono text-xs text-amber-300"><Satellite className="h-4 w-4" /> FLARES · NASA DONKI {flares.fallback && <span className="text-amber-300">[fallback]</span>}</div>
              <div className="display-font mt-2 text-4xl font-bold text-white">{topFlare}<span className="text-base font-normal text-slate-400"> strongest</span></div>
              <div className="mt-3 space-y-1 font-mono text-[11px] text-slate-400">
                {flares.data.slice(-5).reverse().map((f) => (
                  <div key={f.id} className="flex justify-between border-b border-white/5 pb-1">
                    <span>{(f.peakTime || "").slice(5, 16).replace("T", " ")}</span>
                    <span className="text-slate-200">{f.classType} · {f.sourceLocation}</span>
                  </div>
                ))}
              </div>
              <a href="/api/flares" className="mt-3 inline-block font-mono text-[11px] text-amber-300 hover:underline">GET /api/flares →</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 02 ENGINE */}
      <section id="engine" className="mx-auto w-full max-w-6xl px-5 py-14">
        <Reveal>
          <div className="font-mono text-xs tracking-widest text-violet-300">02 — ENGINE</div>
          <h2 className="display-font mt-2 text-3xl font-bold text-white md:text-4xl">One deterministic score, every factor shown.</h2>
        </Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <Reveal delay={0.05}>
            <div className={`rounded-2xl border p-6 md:col-span-2 ${levelColor(assessment.level)}`}>
              <div className="font-mono text-[11px] tracking-widest opacity-80">CURRENT RISK</div>
              <div className="display-font mt-1 text-6xl font-extrabold">{assessment.score}</div>
              <div className="mt-1 font-mono text-sm tracking-widest">{assessment.level}</div>
              <p className="mt-3 text-sm opacity-90">{assessment.guidance}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div>GRID · {assessment.impacts.powerGrid}</div>
                <div>GPS · {assessment.impacts.gps}</div>
                <div>COMMS · {assessment.impacts.comms}</div>
                <div>AURORA · {assessment.impacts.aurora}</div>
              </div>
            </div>
          </Reveal>
          <div className="md:col-span-3">
            <div className="glass rounded-2xl border border-white/10 p-6">
              {assessment.factors.map((f, i) => (
                <Reveal key={f.name} delay={i * 0.05}>
                  <div className="mb-4">
                    <div className="flex justify-between font-mono text-[11px] text-slate-300">
                      <span>{f.name}</span>
                      <span className="text-white">{f.points} / {f.max}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-rose-400" style={{ width: `${Math.round((f.points / f.max) * 100)}%` }} />
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-slate-500">{f.detail}</div>
                  </div>
                </Reveal>
              ))}
              <a href="/api/risk" className="font-mono text-[11px] text-cyan-300 hover:underline">GET /api/risk → sealed assessment</a>
            </div>
          </div>
        </div>
      </section>

      {/* 03 PLANET */}
      <section id="planet" className="mx-auto w-full max-w-6xl px-5 py-14">
        <Reveal>
          <div className="font-mono text-xs tracking-widest text-cyan-300">03 — PLANET</div>
          <h2 className="display-font mt-2 text-3xl font-bold text-white md:text-4xl">The storm, on Earth.</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">react-globe.gl renders live aurora ovals, storm arcs and pulse rings from the current Kp — auto-rotating, pausing when you grab it.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="glass mt-6 overflow-hidden rounded-2xl border border-white/10">
            <GlobeLoader kp={latestKp.kp} windSpeed={latestWind.speed} bz={latestWind.bzGsm} />
          </div>
        </Reveal>
      </section>

      {/* 04 AGENTS */}
      <section id="agents" className="mx-auto w-full max-w-6xl px-5 py-14">
        <Reveal>
          <div className="font-mono text-xs tracking-widest text-emerald-300">04 — AGENTS</div>
          <h2 className="display-font mt-2 text-3xl font-bold text-white md:text-4xl">Coding agents use it as a tool.</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">MCP-style JSON-RPC over <span className="font-mono text-emerald-200">POST /api/mcp</span>: initialize, tools/list, tools/call. Try it live:</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-6"><McpConsole /></div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="glass mt-4 rounded-2xl border border-white/10 p-5">
            <div className="font-mono text-[11px] tracking-widest text-slate-400">ADD TO YOUR AGENT · public/mcp.json</div>
            <pre className="mt-2 overflow-auto font-mono text-[11px] leading-relaxed text-slate-300">{`{
  "mcpServers": {
    "solar-sentinel": { "url": "https://solar-sentinel-vert.vercel.app/api/mcp" }
  }
}`}</pre>
          </div>
        </Reveal>
      </section>

      {/* 05 INTEGRITY */}
      <section id="integrity" className="mx-auto w-full max-w-6xl px-5 py-14">
        <Reveal>
          <div className="font-mono text-xs tracking-widest text-amber-300">05 — INTEGRITY</div>
          <h2 className="display-font mt-2 text-3xl font-bold text-white md:text-4xl">Every score is sealed.</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">SHA-384(prevSeal ‖ canonicalJson) hash chains — verify by replay with the <span className="font-mono text-emerald-200">verify_seal_chain</span> tool.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="glass mt-6 rounded-2xl border border-white/10 p-5">
            <div className="flex items-center gap-2 font-mono text-xs text-emerald-300"><ShieldCheck className="h-4 w-4" /> CURRENT SEAL</div>
            <pre className="mt-3 overflow-auto font-mono text-[11px] leading-relaxed text-slate-300">algo     SHA-384
prevSeal {seal.prevSeal.slice(0, 48)}…
seal     {seal.seal.slice(0, 48)}…
score    {assessment.score}/100 {assessment.level} · {assessment.computedAt}</pre>
            <div className="mt-3 font-mono text-[11px] text-slate-500">curl -X POST /api/mcp -d {`'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"verify_seal_chain","records":[…],"seals":[…]}}'`}</div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 text-center">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <Star className="h-3.5 w-3.5 text-amber-300" /> Solar Sentinel · MIT · by aniruddhaadak80
          </div>
          <p className="max-w-2xl text-[11px] leading-relaxed text-slate-500">
            Data: NOAA Space Weather Prediction Center (solar wind, planetary K-index) + NASA DONKI (flares).
            Informational only — not a substitute for official space-weather alerts. During solar-max 2025–2026, always confirm critical decisions with SWPC.
          </p>
        </div>
      </footer>
    </div>
  );
}
