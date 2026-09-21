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

interface RtswWind {
  time_tag?: string;
  active?: boolean;
  proton_speed?: number | null;
  proton_temperature?: number | null;
  proton_density?: number | null;
}

interface RtswMag {
  time_tag?: string;
  active?: boolean;
  bt?: number | null;
  bz_gsm?: number | null;
}

/**
 * NOAA solar wind via the post-2026 RTSW feeds (SOLAR-1 primary, ACE backup):
 * json/rtsw/rtsw_wind_1m.json + rtsw_mag_1m.json, joined on minute timestamp.
 * Prefers active-spacecraft rows, downsamples to ~every 15 min. Sealed fallback offline.
 */
export async function getSolarWind(): Promise<FeedEnvelope<SolarWindPoint>> {
  const fetchedAt = new Date().toISOString();
  try {
    const [wind, mag] = await Promise.all([
      fetchJson(`${FEED_SOURCES.wind}rtsw_wind_1m.json`, 20000) as Promise<RtswWind[]>,
      fetchJson(`${FEED_SOURCES.wind}rtsw_mag_1m.json`, 20000) as Promise<RtswMag[]>,
    ]);
    if (!Array.isArray(wind) || !Array.isArray(mag)) throw new Error("unexpected rtsw shape");
    const magByTime = new Map<string, RtswMag>();
    for (const m of mag) {
      if (typeof m.time_tag !== "string") continue;
      const prev = magByTime.get(m.time_tag);
      if (!prev || (m.active && !prev.active)) magByTime.set(m.time_tag, m);
    }
    const byTime = new Map<string, SolarWindPoint>();
    for (const w of wind) {
      if (typeof w.time_tag !== "string") continue;
      const speed = num(w.proton_speed);
      if (!Number.isFinite(speed) || speed <= 0 || speed > 2500) continue;
      const m = magByTime.get(w.time_tag.slice(0, 16));
      const prev = byTime.get(w.time_tag);
      if (prev && !w.active) continue;
      byTime.set(w.time_tag, {
        time: w.time_tag.length === 16 ? `${w.time_tag}:00` : w.time_tag,
        speed,
        density: num(w.proton_density, 5),
        temperature: num(w.proton_temperature, 100000),
        bzGsm: m ? num(m.bz_gsm, 0) : 0,
        bt: m ? num(m.bt, 5) : 5,
      });
    }
    const sorted = [...byTime.values()].sort((a, b) => (a.time < b.time ? -1 : 1));
    // Downsample 1-min cadence to ~15-min steps, cap at 96 points.
    const step = Math.max(1, Math.floor(sorted.length / 96));
    const data = sorted.filter((_, i) => i % step === 0).slice(-96);
    if (data.length === 0) throw new Error("empty rtsw feed");
    return { data, count: data.length, fetchedAt, fallback: false, source: FEED_SOURCES.wind };
  } catch {
    return { data: FALLBACK_WIND, count: FALLBACK_WIND.length, fetchedAt, fallback: true, source: FEED_SOURCES.wind };
  }
}

/** NOAA planetary K-index (object rows since 2026; legacy header rows tolerated). Sealed fallback offline. */
export async function getKp(): Promise<FeedEnvelope<KpPoint>> {
  const fetchedAt = new Date().toISOString();
  try {
    const raw = (await fetchJson(FEED_SOURCES.kp)) as unknown[];
    const data: KpPoint[] = [];
    for (const row of raw) {
      if (Array.isArray(row)) {
        if (typeof row[0] !== "string" || row[0] === "time_tag") continue;
        const kp = num(row[1]);
        if (!Number.isFinite(kp)) continue;
        data.push({ time: row[0], kp, aRunning: num(row[2], 0), stationCount: Math.round(num(row[3], 0)) });
      } else if (row && typeof row === "object") {
        const r = row as Record<string, unknown>;
        if (typeof r.time_tag !== "string") continue;
        const kp = num(r.Kp ?? r.kp);
        if (!Number.isFinite(kp)) continue;
        data.push({ time: r.time_tag, kp, aRunning: num(r.a_running, 0), stationCount: Math.round(num(r.station_count, 0)) });
      }
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
