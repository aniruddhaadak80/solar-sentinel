import { assessRisk } from "@/lib/engine";
import { getFlares, getKp, getSolarWind } from "@/lib/feeds";
import { sealRecord, verifyChain } from "@/lib/seal";
import type { McpToolDef } from "@/lib/types";

const TOOLS: McpToolDef[] = [
  {
    name: "get_kp_index",
    description: "Latest NOAA planetary K-index readings (geomagnetic activity, 0-9).",
    inputSchema: { type: "object", properties: { limit: { type: "number", default: 8 } } },
  },
  {
    name: "get_solar_wind",
    description: "Latest NOAA solar-wind plasma + magnetic field points (speed, density, Bz).",
    inputSchema: { type: "object", properties: { limit: { type: "number", default: 8 } } },
  },
  {
    name: "get_flares",
    description: "Recent NASA DONKI solar flares with class, timing and active region.",
    inputSchema: { type: "object", properties: { limit: { type: "number", default: 5 } } },
  },
  {
    name: "assess_geomagnetic_risk",
    description: "Run the deterministic storm-risk engine (0-100 + itemized factors + seal). Same function as UI and REST.",
    inputSchema: {
      type: "object",
      properties: {
        kp: { type: "number" },
        solarWindSpeed: { type: "number" },
        density: { type: "number" },
        bzGsm: { type: "number" },
        maxFlareClass: { type: "string" },
      },
    },
  },
  {
    name: "verify_seal_chain",
    description: "Verify hash-chained SHA-384 audit seals by replay. Pass parallel records[] + seals[].",
    inputSchema: {
      type: "object",
      properties: { records: { type: "array" }, seals: { type: "array", items: { type: "string" } } },
      required: ["records", "seals"],
    },
  },
];

interface RpcBody {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown>; records?: unknown[]; seals?: string[] } & Record<string, unknown>;
}

function numArg(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function limitOf(args: Record<string, unknown> | undefined, dflt: number): number {
  const l = args ? numArg(args.limit, dflt) : dflt;
  return Math.min(40, Math.max(1, Math.floor(l)));
}

export async function POST(req: Request) {
  const body = (await req.json()) as RpcBody;
  const id = body.id ?? 1;
  const ok = (result: unknown) => Response.json({ jsonrpc: "2.0", id, result });
  const err = (code: number, message: string) => Response.json({ jsonrpc: "2.0", id, error: { code, message } });

  switch (body.method) {
    case "initialize":
      return ok({ protocolVersion: "2024-11-05", serverInfo: { name: "solar-sentinel", version: "1.0.0" }, capabilities: { tools: {} } });
    case "tools/list":
      return ok({ tools: TOOLS });
    case "tools/call": {
      const name = body.params?.name ?? "";
      const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        if (name === "get_kp_index") {
          const feed = await getKp();
          return ok({ content: [{ type: "text", text: JSON.stringify(feed.data.slice(-limitOf(args, 8))) }], fallback: feed.fallback });
        }
        if (name === "get_solar_wind") {
          const feed = await getSolarWind();
          return ok({ content: [{ type: "text", text: JSON.stringify(feed.data.slice(-limitOf(args, 8))) }], fallback: feed.fallback });
        }
        if (name === "get_flares") {
          const feed = await getFlares();
          return ok({ content: [{ type: "text", text: JSON.stringify(feed.data.slice(-limitOf(args, 5))) }], fallback: feed.fallback });
        }
        if (name === "assess_geomagnetic_risk") {
          const assessment = assessRisk({
            kp: numArg(args.kp, 0),
            solarWindSpeed: numArg(args.solarWindSpeed, 350),
            density: numArg(args.density, 5),
            bzGsm: numArg(args.bzGsm, 0),
            maxFlareClass: typeof args.maxFlareClass === "string" ? args.maxFlareClass : "—",
          });
          const seal = sealRecord(assessment);
          return ok({ content: [{ type: "text", text: JSON.stringify({ assessment, seal }) }] });
        }
        if (name === "verify_seal_chain") {
          const records = Array.isArray(args.records) ? (args.records as unknown[]) : [];
          const seals = Array.isArray(args.seals) ? (args.seals as string[]) : [];
          if (!records.length || records.length !== seals.length) {
            return err(-32602, "verify_seal_chain needs the same number of records and seals");
          }
          return ok({ content: [{ type: "text", text: JSON.stringify({ valid: verifyChain(records, seals) }) }] });
        }
        return err(-32601, `unknown tool: ${name}`);
      } catch (e) {
        return err(-32603, e instanceof Error ? e.message : "tool failed");
      }
    }
    default:
      return err(-32601, `unknown method: ${body.method ?? "—"}`);
  }
}

export async function GET() {
  return Response.json({ jsonrpc: "2.0", tools: TOOLS.map((t) => t.name), endpoint: "/api/mcp" });
}
