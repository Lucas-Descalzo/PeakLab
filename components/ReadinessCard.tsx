"use client";
import { useEffect, useState } from "react";

interface Readiness {
  score: number;
  label: string;
  color: string;
  hrv_score: number;
  sleep_score: number;
  load_score: number;
  recommendation: string;
  hrv?: number;
}

// Gauge arc color by readiness color key
const GAUGE_COLOR: Record<string, string> = {
  green:  "#22c55e",
  lime:   "#84cc16",
  yellow: "#eab308",
  orange: "#f97316",
  red:    "#ef4444",
};

const TEXT_COLOR: Record<string, string> = {
  green:  "text-green-400",
  lime:   "text-lime-400",
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  red:    "text-red-400",
};


function subScoreColor(value: number): string {
  if (value >= 70) return "text-green-400";
  if (value >= 50) return "text-yellow-400";
  return "text-red-400";
}

function subScoreChipBg(value: number): string {
  if (value >= 70) return "bg-green-500/10 border-green-500/20 text-green-300";
  if (value >= 50) return "bg-yellow-500/10 border-yellow-500/20 text-yellow-300";
  return "bg-red-500/10 border-red-500/20 text-red-300";
}

/** SVG semicircular gauge.
 *  The arc runs from 9 o'clock (180°) to 0° (east), i.e. left→right across the top.
 *  cx=90, cy=90, r=68, strokeWidth=10
 *  Full arc length = π * r ≈ 213.6
 */
function GaugeSVG({ score, color }: { score: number; color: string }) {
  const cx = 90, cy = 90, r = 68, sw = 10;
  // Full semicircle arc length
  const fullArc = Math.PI * r; // ≈ 213.6
  const filled = (score / 100) * fullArc;
  const empty = fullArc - filled;

  // Arc starts at 180° (left) and goes clockwise to 0° (right)
  // In SVG: M (cx - r, cy) arc to (cx + r, cy)
  const arcColor = GAUGE_COLOR[color] || "#3B82F6";

  return (
    <svg
      viewBox="0 0 180 100"
      width="180"
      height="100"
      className="overflow-visible"
      aria-hidden="true"
    >
      {/* Background arc (track) */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#27272a"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      {/* Filled arc */}
      {score > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={arcColor}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${empty}`}
          style={{
            filter: `drop-shadow(0 0 6px ${arcColor}80)`,
          }}
        />
      )}
    </svg>
  );
}

export default function ReadinessCard() {
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/readiness")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-5 animate-pulse">
        <div className="h-3 bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="flex justify-center">
          <div className="w-44 h-24 bg-zinc-800 rounded-full" />
        </div>
        <div className="flex gap-2 mt-4">
          <div className="flex-1 h-12 bg-zinc-800 rounded-xl" />
          <div className="flex-1 h-12 bg-zinc-800 rounded-xl" />
          <div className="flex-1 h-12 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const textColor = TEXT_COLOR[data.color] || "text-zinc-300";

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
          Training Readiness
        </p>
        {data.hrv && (
          <span className="text-zinc-500 text-xs font-mono bg-zinc-800 px-2 py-0.5 rounded-full">
            HRV {data.hrv}ms
          </span>
        )}
      </div>

      {/* Gauge + score */}
      <div className="flex flex-col items-center -mb-2">
        <div className="relative">
          <GaugeSVG score={data.score} color={data.color} />
          {/* Centered score text inside the arc */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-1">
            <span className={`text-4xl font-black leading-none tracking-tight ${textColor}`}>
              {data.score}
            </span>
            <span className={`text-xs font-semibold mt-0.5 uppercase tracking-wider ${textColor}`}>
              {data.label}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <p className="text-zinc-400 text-sm text-center mb-4 px-2 leading-snug">
        {data.recommendation}
      </p>

      {/* Sub-score chips */}
      <div className="flex gap-2">
        {[
          { label: "HRV", value: data.hrv_score },
          { label: "Sueño", value: data.sleep_score },
          { label: "Carga", value: data.load_score },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border ${subScoreChipBg(s.value)}`}
          >
            <span className={`text-base font-bold leading-none ${subScoreColor(s.value)}`}>
              {s.value}
            </span>
            <span className="text-zinc-500 text-xs mt-1">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
