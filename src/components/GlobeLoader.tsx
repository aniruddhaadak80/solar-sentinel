"use client";

import dynamic from "next/dynamic";

const GlobeView = dynamic(() => import("@/components/GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center md:h-[520px]" aria-label="Loading 3D globe">
      <div className="h-40 w-40 animate-pulse rounded-full border border-cyan-400/40 bg-cyan-400/10" />
    </div>
  ),
});

export default function GlobeLoader({ kp, windSpeed, bz }: { kp: number; windSpeed: number; bz: number }) {
  return <GlobeView kp={kp} windSpeed={windSpeed} bz={bz} />;
}
