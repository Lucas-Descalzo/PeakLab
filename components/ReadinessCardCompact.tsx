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

const SCORE_COLOR: Record<string, string> = {
  green:  "text-lime-400",
  lime:   "text-lime-400",
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  red:    "text-red-400",
};

const DOT_COLOR_FOR_SCORE = (score: number): string => {
  if (score >= 70) return "bg-lime-400";
  if (score >= 50) return "bg-yellow-400";
  return "bg-red-400";
};

export default function ReadinessCardCompact() {
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
      <div className="animate-pulse space-y-3">
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-[#1e2a35] rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#1e2a35] rounded w-1/2" />
            <div className="h-3 bg-[#1e2a35] rounded w-3/4" />
            <div className="h-3 bg-[#1e2a35] rounded w-2/3" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-3 bg-[#1e2a35] rounded w-1/3" />
          <div className="h-3 bg-[#1e2a35] rounded w-1/3" />
          <div className="h-3 bg-[#1e2a35] rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const scoreColorClass = SCORE_COLOR[data.color] || "text-lime-400";

  return (
    <div>
      {/* Main row */}
      <div className="flex items-center gap-4">
        {/* Score */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-[#080c10] rounded-xl border border-[#1e2a35]">
          <span className={`text-2xl font-black leading-none ${scoreColorClass}`}>{data.score}</span>
          <span className="text-slate-500 text-xs mt-0.5">/ 100</span>
        </div>
        {/* Label + recommendation */}
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-base leading-tight ${scoreColorClass}`}>{data.label}</p>
          <p className="text-slate-500 text-sm mt-0.5 leading-snug line-clamp-2">→ {data.recommendation}</p>
        </div>
      </div>

      {/* Factor dots */}
      <div className="flex gap-4 mt-3">
        {[
          { label: "HRV", score: data.hrv_score },
          { label: "Sueño", score: data.sleep_score },
          { label: "Carga", score: data.load_score },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${DOT_COLOR_FOR_SCORE(f.score)}`} />
            <span className="text-slate-500 text-xs">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
