export interface SolarWindPoint {
  time: string;
  speed: number; // km/s
  density: number; // p/cm^3
  temperature: number; // K
  bzGsm: number; // nT (southward < 0)
  bt: number; // nT total field
}

export interface KpPoint {
  time: string;
  kp: number;
  aRunning: number;
  stationCount: number;
}

export interface SolarFlare {
  id: string;
  beginTime: string;
  peakTime: string;
  endTime: string;
  classType: string; // e.g. "M2.4", "X1.0"
  sourceLocation: string;
  activeRegion: number | null;
  link: string;
}

export type RiskLevel = "LOW" | "ELEVATED" | "HIGH" | "SEVERE" | "EXTREME";

export interface RiskFactor {
  name: string;
  points: number;
  max: number;
  detail: string;
}

export interface RiskAssessment {
  score: number; // 0-100
  level: RiskLevel;
  factors: RiskFactor[];
  guidance: string;
  impacts: {
    powerGrid: string;
    gps: string;
    comms: string;
    aurora: string;
  };
  inputs: {
    kp: number;
    solarWindSpeed: number;
    density: number;
    bzGsm: number;
    maxFlareClass: string;
  };
  computedAt: string;
}

export interface Seal {
  algo: "SHA-384";
  prevSeal: string;
  canonical: string;
  seal: string;
}

export interface SealedRisk {
  assessment: RiskAssessment;
  seal: Seal;
  sources: string[];
  fallback: boolean;
}

export interface FeedEnvelope<T> {
  data: T[];
  count: number;
  fetchedAt: string;
  fallback: boolean;
  source: string;
}

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
