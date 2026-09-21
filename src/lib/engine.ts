import type { RiskAssessment, RiskFactor, RiskLevel } from "./types";

export interface EngineInputs {
  kp: number;
  solarWindSpeed: number;
  density: number;
  bzGsm: number;
  maxFlareClass: string;
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** Flare class (A/B/C/M/X + magnitude) -> 0..15 points. Explainable, no network, no keys. */
export function flarePoints(classType: string): { points: number; detail: string } {
  const m = /^([ABCMX])\s*([0-9]+(?:\.[0-9]+)?)?/i.exec((classType ?? "").trim());
  if (!m) return { points: 0, detail: `no flare class parsed from "${classType}"` };
  const letter = m[1].toUpperCase();
  const mag = m[2] ? parseFloat(m[2]) : 1;
  const base: Record<string, number> = { A: 1, B: 3, C: 6, M: 11, X: 14 };
  const magnitudeBonus = Math.min(1, Math.max(0, (mag - 1) / 9));
  const points = Math.min(15, base[letter] + magnitudeBonus);
  return { points: round1(points), detail: `class ${letter}${m[2] ?? ""} -> base ${base[letter]} + magnitude bonus ${round1(magnitudeBonus)}` };
}

export function levelForScore(score: number): RiskLevel {
  if (score >= 80) return "EXTREME";
  if (score >= 60) return "SEVERE";
  if (score >= 40) return "HIGH";
  if (score >= 20) return "ELEVATED";
  return "LOW";
}

function guidanceFor(level: RiskLevel): string {
  switch (level) {
    case "EXTREME":
      return "Extreme geomagnetic activity likely. Expect grid instability, widespread GPS degradation and HF blackouts. Aurora visible at mid latitudes.";
    case "SEVERE":
      return "Severe storm conditions. Power-grid operators should watch GICs; GPS and HF comms may degrade. Aurora likely at high-mid latitudes.";
    case "HIGH":
      return "Active storm watch. Satellite ops and precision GPS users take precautions. Aurora possible at high latitudes.";
    case "ELEVATED":
      return "Unsettled conditions. Minor GPS/HF flutter possible. Good aurora odds near the poles.";
    default:
      return "Quiet conditions. No meaningful impact on infrastructure. Aurora confined to polar night.";
  }
}

/**
 * Deterministic geomagnetic-risk engine.
 * THE SAME function serves the UI, the REST API and the MCP agent tool.
 * Weights sum to 100: Kp 35 + solar-wind speed 20 + Bz southward 20 + flare 15 + density 10.
 */
export function assessRisk(inputs: EngineInputs, computedAt?: string): RiskAssessment {
  const kp = Number.isFinite(inputs.kp) ? inputs.kp : 0;
  const speed = Number.isFinite(inputs.solarWindSpeed) ? inputs.solarWindSpeed : 350;
  const density = Number.isFinite(inputs.density) ? inputs.density : 5;
  const bz = Number.isFinite(inputs.bzGsm) ? inputs.bzGsm : 0;
  const maxFlareClass = inputs.maxFlareClass || "—";

  const kpPts = round1(clamp01(kp / 9) * 35);
  const speedPts = round1(clamp01((speed - 300) / 700) * 20);
  const bzPts = round1(clamp01(-bz / 30) * 20);
  const flare = flarePoints(maxFlareClass);
  const densityPts = round1(clamp01((density - 5) / 45) * 10);

  const factors: RiskFactor[] = [
    { name: "Planetary K-index", points: kpPts, max: 35, detail: `Kp ${round1(kp)} / 9 -> ${(round1(kpPts))} pts` },
    { name: "Solar-wind speed", points: speedPts, max: 20, detail: `${Math.round(speed)} km/s (baseline 300, saturates 1000)` },
    { name: "IMF Bz southward", points: bzPts, max: 20, detail: `Bz ${round1(bz)} nT (southward couples into magnetosphere)` },
    { name: "Strongest flare", points: flare.points, max: 15, detail: flare.detail },
    { name: "Plasma density", points: densityPts, max: 10, detail: `${round1(density)} p/cm^3 (ram pressure proxy)` },
  ];

  const score = Math.round(Math.min(100, kpPts + speedPts + bzPts + flare.points + densityPts));
  const level = levelForScore(score);

  return {
    score,
    level,
    factors,
    guidance: guidanceFor(level),
    impacts: {
      powerGrid:
        score >= 80 ? "GIC risk: transformers at high latitude under stress" : score >= 60 ? "Watch GICs on long lines" : score >= 40 ? "Minor GIC fluctuations possible" : "Nominal",
      gps:
        score >= 80 ? "Widespread positioning errors" : score >= 60 ? "Degraded precision GPS" : score >= 40 ? "Occasional scintillation" : "Nominal",
      comms:
        score >= 60 ? "HF blackouts likely on sunlit side" : score >= 40 ? "HF fade possible" : "Nominal",
      aurora:
        score >= 80 ? "Aurora to ~40° magnetic latitude" : score >= 60 ? "Aurora to ~50°" : score >= 40 ? "Aurora across high latitudes" : score >= 20 ? "Aurora near polar oval" : "Polar night only",
    },
    inputs: { kp: round1(kp), solarWindSpeed: Math.round(speed), density: round1(density), bzGsm: round1(bz), maxFlareClass },
    computedAt: computedAt ?? new Date().toISOString(),
  };
}
