"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";

interface AuroraPoint {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
}

interface StormArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
}

interface AuroraRing {
  lat: number;
  lng: number;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
  color: string;
}

// Minimal structural type for the globe controls we touch (no three imports here).
interface GlobeControlsHandle {
  controls: () => { autoRotate: boolean; autoRotateSpeed: number };
}

type GlobeProps = Record<string, unknown>;

function auroraColor(kp: number): string {
  if (kp >= 7) return "#fb7185";
  if (kp >= 5) return "#fbbf24";
  if (kp >= 4) return "#a78bfa";
  return "#34d399";
}

/** Lightweight 2D canvas fallback — used ONLY if react-globe.gl fails to load. */
function GlobeFallback({ kp }: { kp: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const draw = () => {
      t += 0.008;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.32;
      const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.6);
      grad.addColorStop(0, "rgba(34,211,238,0.25)");
      grad.addColorStop(1, "rgba(4,6,12,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(34,211,238,0.8)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 42; i++) {
        const a = t + (i / 42) * Math.PI * 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a * 1.3) * r * 0.42;
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + (i % 5 === 0 ? kp * 0.4 : 0), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(148,163,184,0.9)";
      ctx.font = "12px monospace";
      ctx.fillText("2D fallback · library globe unavailable offline", 12, h - 12);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [kp]);
  return <canvas ref={ref} width={640} height={520} className="h-[420px] w-full md:h-[520px]" aria-label="2D globe fallback" />;
}

export default function GlobeView({ kp, windSpeed, bz }: { kp: number; windSpeed: number; bz: number }) {
  const [Globe, setGlobe] = useState<ComponentType<GlobeProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const globeRef = useRef<GlobeControlsHandle | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic import on the client only; failures fall back to lightweight canvas.
  useEffect(() => {
    let live = true;
    queueMicrotask(() => {
      import("react-globe.gl")
        .then((m) => {
          if (live) setGlobe(() => m.default as ComponentType<GlobeProps>);
        })
        .catch(() => {
          if (live) setFailed(true);
        });
    });
    return () => {
      live = false;
    };
  }, []);

  // Auto-rotate; pause on interaction, resume after 4s idle. Ref writes live in effects/handlers.
  useEffect(() => {
    const controls = globeRef.current?.controls?.();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.7;
    }
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [Globe]);

  const pause = () => {
    const controls = globeRef.current?.controls?.();
    if (controls) controls.autoRotate = false;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      const c = globeRef.current?.controls?.();
      if (c) c.autoRotate = true;
    }, 4000);
  };

  const points: AuroraPoint[] = useMemo(() => {
    const color = auroraColor(kp);
    const pts: AuroraPoint[] = [];
    for (let i = 0; i < 36; i++) {
      const lng = -180 + i * 10;
      pts.push({ lat: 67 + Math.sin(i * 0.7) * 3, lng, size: 0.7 + kp * 0.12, color, label: `aurora ${lng}°` });
      pts.push({ lat: -67 - Math.cos(i * 0.6) * 3, lng, size: 0.6 + kp * 0.1, color, label: `aurora-south ${lng}°` });
    }
    return pts;
  }, [kp]);

  const arcs: StormArc[] = useMemo(() => {
    const n = Math.min(10, 3 + Math.round(kp));
    const color = bz < -5 ? "#fb7185" : windSpeed > 550 ? "#fbbf24" : "#22d3ee";
    return Array.from({ length: n }, (_, i) => ({
      startLat: 12,
      startLng: -40 + i * 14,
      endLat: i % 2 === 0 ? 66 : -64,
      endLng: -30 + i * 22,
      color,
    }));
  }, [kp, windSpeed, bz]);

  const rings: AuroraRing[] = useMemo(
    () => [
      { lat: 67, lng: -20, maxR: 6 + kp, propagationSpeed: 1.4, repeatPeriod: 2200, color: auroraColor(kp) },
      { lat: -67, lng: 150, maxR: 5 + kp * 0.8, propagationSpeed: 1.2, repeatPeriod: 2600, color: auroraColor(kp) },
    ],
    [kp],
  );

  if (failed) return <GlobeFallback kp={kp} />;
  if (!Globe) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center md:h-[520px]" aria-label="Loading 3D globe">
        <div className="h-40 w-40 animate-pulse rounded-full border border-cyan-400/40 bg-cyan-400/10" />
      </div>
    );
  }

  return (
    <div onPointerDown={pause} onWheel={pause} className="h-[420px] w-full md:h-[520px]">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#22d3ee"
        atmosphereAltitude={0.22}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.02}
        pointRadius="size"
        pointColor="color"
        arcsData={arcs}
        arcColor="color"
        arcStroke={0.8}
        arcDashLength={0.5}
        arcDashGap={0.2}
        arcDashAnimateTime={2200}
        ringsData={rings}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringColor="color"
        width={640}
        height={520}
      />
    </div>
  );
}
