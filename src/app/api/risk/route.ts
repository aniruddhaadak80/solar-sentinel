import { assessRisk } from "@/lib/engine";
import { getFlares, getKp, getSolarWind } from "@/lib/feeds";
import { sealRecord, windowSealId } from "@/lib/seal";
import type { SealedRisk } from "@/lib/types";

export const revalidate = 300;

function strongestFlare(classes: string[]): string {
  const rank = (c: string) => ({ A: 0, B: 1, C: 2, M: 3, X: 4 })[c.charAt(0).toUpperCase() as "A"] ?? -1;
  let best = "—";
  for (const c of classes) if (rank(c) > rank(best)) best = c;
  return best;
}

/** GET: live sealed risk from current feeds. POST: score caller-supplied inputs. */
export async function GET() {
  const [wind, kp, flares] = await Promise.all([getSolarWind(), getKp(), getFlares()]);
  const latestWind = wind.data[wind.data.length - 1];
  const latestKp = kp.data[kp.data.length - 1];
  const assessment = assessRisk(
    {
      kp: latestKp.kp,
      solarWindSpeed: latestWind.speed,
      density: latestWind.density,
      bzGsm: latestWind.bzGsm,
      maxFlareClass: strongestFlare(flares.data.map((f) => f.classType)),
    },
    new Date().toISOString(),
  );
  const prevSeal = windowSealId([...wind.data.map((w) => w.time), ...kp.data.map((k) => k.time)]);
  const seal = sealRecord(assessment, prevSeal);
  const body: SealedRisk = {
    assessment,
    seal,
    sources: [wind.source, kp.source, flares.source],
    fallback: wind.fallback || kp.fallback || flares.fallback,
  };
  return Response.json(body);
}

export async function POST(req: Request) {
  const input = (await req.json()) as {
    kp?: number;
    solarWindSpeed?: number;
    density?: number;
    bzGsm?: number;
    maxFlareClass?: string;
  };
  const assessment = assessRisk({
    kp: typeof input.kp === "number" ? input.kp : 0,
    solarWindSpeed: typeof input.solarWindSpeed === "number" ? input.solarWindSpeed : 350,
    density: typeof input.density === "number" ? input.density : 5,
    bzGsm: typeof input.bzGsm === "number" ? input.bzGsm : 0,
    maxFlareClass: typeof input.maxFlareClass === "string" ? input.maxFlareClass : "—",
  });
  const seal = sealRecord(assessment);
  const body: SealedRisk = { assessment, seal, sources: ["caller-supplied"], fallback: false };
  return Response.json(body);
}
