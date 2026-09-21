"use client";

import { useState } from "react";

const PRESETS: { label: string; body: Record<string, unknown> }[] = [
  { label: "tools/list", body: { jsonrpc: "2.0", id: 1, method: "tools/list" } },
  {
    label: "assess risk",
    body: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "assess_geomagnetic_risk", arguments: { kp: 6.2, solarWindSpeed: 610, density: 12, bzGsm: -11, maxFlareClass: "M4.2" } },
    },
  },
  {
    label: "get Kp",
    body: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_kp_index", arguments: { limit: 3 } } },
  },
];

export default function McpConsole() {
  const [output, setOutput] = useState("Press a preset — the console POSTs JSON-RPC to /api/mcp and prints the raw reply.");
  const [busy, setBusy] = useState(false);

  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as unknown;
      setOutput(JSON.stringify(json, null, 2).slice(0, 4000));
    } catch (e) {
      setOutput(`error: ${e instanceof Error ? e.message : "request failed"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50">
      <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            disabled={busy}
            onClick={() => void run(p.body)}
            className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 font-mono text-xs text-emerald-200 transition hover:bg-emerald-400/20 disabled:opacity-50"
          >
            {busy ? "…" : `▶ ${p.label}`}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-slate-500">POST /api/mcp · JSON-RPC 2.0</span>
      </div>
      <pre className="max-h-72 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90">{output}</pre>
    </div>
  );
}
