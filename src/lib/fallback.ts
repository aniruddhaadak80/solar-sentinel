import type { KpPoint, SolarFlare, SolarWindPoint } from "./types";

/** Sealed offline samples so build, demo and first paint never break without network. */
export const FALLBACK_WIND: SolarWindPoint[] = [
  { time: "2026-09-18T00:00:00Z", speed: 412, density: 6.2, temperature: 98200, bzGsm: -2.1, bt: 5.4 },
  { time: "2026-09-18T06:00:00Z", speed: 438, density: 8.9, temperature: 110400, bzGsm: -4.6, bt: 7.1 },
  { time: "2026-09-18T12:00:00Z", speed: 521, density: 11.4, temperature: 154800, bzGsm: -8.3, bt: 10.2 },
  { time: "2026-09-18T18:00:00Z", speed: 587, density: 14.1, temperature: 189300, bzGsm: -11.7, bt: 13.8 },
  { time: "2026-09-19T00:00:00Z", speed: 612, density: 12.6, temperature: 201500, bzGsm: -9.4, bt: 12.1 },
  { time: "2026-09-19T06:00:00Z", speed: 558, density: 9.8, temperature: 167200, bzGsm: -5.2, bt: 8.7 },
  { time: "2026-09-19T12:00:00Z", speed: 489, density: 7.3, temperature: 131600, bzGsm: -1.8, bt: 6.0 },
  { time: "2026-09-20T00:00:00Z", speed: 445, density: 5.9, temperature: 104900, bzGsm: 1.2, bt: 4.8 },
];

export const FALLBACK_KP: KpPoint[] = [
  { time: "2026-09-18T00:00:00Z", kp: 2.3, aRunning: 9, stationCount: 12 },
  { time: "2026-09-18T03:00:00Z", kp: 3.0, aRunning: 12, stationCount: 12 },
  { time: "2026-09-18T06:00:00Z", kp: 3.7, aRunning: 16, stationCount: 13 },
  { time: "2026-09-18T09:00:00Z", kp: 4.3, aRunning: 22, stationCount: 13 },
  { time: "2026-09-18T12:00:00Z", kp: 5.0, aRunning: 30, stationCount: 13 },
  { time: "2026-09-18T15:00:00Z", kp: 5.7, aRunning: 39, stationCount: 12 },
  { time: "2026-09-18T18:00:00Z", kp: 6.0, aRunning: 48, stationCount: 12 },
  { time: "2026-09-19T00:00:00Z", kp: 4.7, aRunning: 34, stationCount: 13 },
];

export const FALLBACK_FLARES: SolarFlare[] = [
  {
    id: "2026-09-18T12:41:00-FLR-001",
    beginTime: "2026-09-18T12:31:00Z",
    peakTime: "2026-09-18T12:41:00Z",
    endTime: "2026-09-18T12:55:00Z",
    classType: "M4.2",
    sourceLocation: "N18W42",
    activeRegion: 4211,
    link: "https://www.swpc.noaa.gov/",
  },
  {
    id: "2026-09-17T08:12:00-FLR-002",
    beginTime: "2026-09-17T08:02:00Z",
    peakTime: "2026-09-17T08:12:00Z",
    endTime: "2026-09-17T08:28:00Z",
    classType: "C7.8",
    sourceLocation: "S11E23",
    activeRegion: 4207,
    link: "https://www.swpc.noaa.gov/",
  },
  {
    id: "2026-09-16T21:03:00-FLR-003",
    beginTime: "2026-09-16T20:51:00Z",
    peakTime: "2026-09-16T21:03:00Z",
    endTime: "2026-09-16T21:29:00Z",
    classType: "X1.1",
    sourceLocation: "N21W55",
    activeRegion: 4204,
    link: "https://www.swpc.noaa.gov/",
  },
];

export const FEED_SOURCES = {
  wind: "https://services.swpc.noaa.gov/products/solar-wind/",
  kp: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  flares: "https://api.nasa.gov/DONKI/FLR",
} as const;
