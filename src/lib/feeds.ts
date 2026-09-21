import { FALLBACK_FLARES, FALLBACK_KP, FALLBACK_WIND, FEED_SOURCES } from "./fallback";
import type { FeedEnvelope, KpPoint, SolarFlare, SolarWindPoint } from "./types";

function num(v: unknown, fallback = NaN): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

async function fetchJson(url: string, timeoutMs = 9000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "solar-sentinel/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

/** NOAA solar-wind plasma + mag, joined on timestamp. Falls back to sealed samples offline. */
export async function getSolarWind(): Promise<FeedEnvelope<SolarWindPoint>> {
  const fetchedAt = new Date().toISOString();
  try {
    const [plasma, mag] = await Promise.all([
      fetchJson(`${FEED_SOURCES.wind}plasma-7-day.json`) as Promise<string[][]>,
      fetchJson(`${FEED_SOURCES.wind}mag-7-day.json`) as Promise<string[][]>,
    ]);
    const magByTime = new Map<string, string[]>();
    for (let i = 1; i < mag.length; i++) magByTime.set(mag[i][0], mag[i]);
    const data: SolarWindPoint[] = [];
    for (let i = 1; i < plasma.length; i++) {
      const row = plasma[i];
      const m = magByTime.get(row[0]);
      const speed = num(row[2]);
      if (!Number.isFinite(speed)) continue;
      data.push({
        time: row[0],
        speed,
        density: num(row[1], 5),
        temperature: num(row[3], 100000),
        bzGsm: m ? num(m[3], 0) : 0,
        bt: m ? num(m[6], 5) : 5,
      });
    }
    const tail = data.slice(-96);
    if (tail.length === 0) throw new Error("empty plasma feed");
    return { data: tail, count: tail.length, fetchedAt, fallback: false, source: FEED_SOURCES.wind };
  } catch {
    return { data: FALLBACK_WIND, count: FALLBACK_WIND.length, fetchedAt, fallback: true, source: FEED_SOURCES.wind };
  }
}

/** NOAA planetary K-index. Falls back to sealed samples offline. */
export async function getKp(): Promise<FeedEnvelope<KpPoint>> {
  const fetchedAt = new Date().toISOString();
  try {
    const raw = (await fetchJson(FEED_SOURCES.kp)) as string[][];
    const data: KpPoint[] = [];
    for (let i = 1; i < raw.length; i++) {
      const kp = num(raw[i][1]);
      if (!Number.isFinite(kp)) continue;
      data.push({ time: raw[i][0], kp, aRunning: num(raw[i][2], 0), stationCount: Math.round(num(raw[i][3], 0)) });
    }
    const tail = data.slice(-40);
    if (tail.length === 0) throw new Error("empty kp feed");
    return { data: tail, count: tail.length, fetchedAt, fallback: false, source: FEED_SOURCES.kp };
  } catch {
    return { data: FALLBACK_KP, count: FALLBACK_KP.length, fetchedAt, fallback: true, source: FEED_SOURCES.kp };
  }
}

interface DonkiFlare {
  flrID?: string;
  beginTime?: string;
  peakTime?: string;
  endTime?: string;
  classType?: string;
  sourceLocation?: string;
  activeRegionNum?: number;
  link?: string;
}

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

/** NASA DONKI solar flares (DEMO_KEY, keyless). Falls back to sealed samples offline. */
export async function getFlares(): Promise<FeedEnvelope<SolarFlare>> {
  const fetchedAt = new Date().toISOString();
  try {
    const url = `${FEED_SOURCES.flares}?startDate=${isoDaysAgo(14)}&endDate=${isoDaysAgo(0)}&api_key=DEMO_KEY`;
    const raw = (await fetchJson(url)) as DonkiFlare[];
    if (!Array.isArray(raw) || raw.length === 0) throw new Error("empty donki feed");
    const data: SolarFlare[] = raw.slice(-20).map((f, i) => ({
      id: f.flrID ?? `donki-${i}`,
      beginTime: f.beginTime ?? "",
      peakTime: f.peakTime ?? f.beginTime ?? "",
      endTime: f.endTime ?? "",
      classType: f.classType ?? "—",
      sourceLocation: f.sourceLocation ?? "—",
      activeRegion: typeof f.activeRegionNum === "number" ? f.activeRegionNum : null,
      link: f.link ?? "https://api.nasa.gov/",
    }));
    return { data, count: data.length, fetchedAt, fallback: false, source: FEED_SOURCES.flares };
  } catch {
    return { data: FALLBACK_FLARES, count: FALLBACK_FLARES.length, fetchedAt, fallback: true, source: FEED_SOURCES.flares };
  }
}
