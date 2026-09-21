"use client";

export default function Ticker({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-black/60 py-2">
      <div className="ticker-track flex w-max gap-8 whitespace-nowrap font-mono text-xs text-cyan-200/90">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
