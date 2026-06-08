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

const GAUGE_COLOR: Record<string, string> = {
  green:  "#4ADE80",
  lime:   "#4ADE80",
  yellow: "#eab308",
  orange: "#f97316",
  red:    "#ef4444",
};

const TEXT_COLOR: Record<string, string> = {
  green:  "text-lime-400",
  lime:   "text-lime-400",
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  red:    "text-red-400",
};

function GaugeSVG({ score, color }: { score: number; color: string }) {
  const cx = 90, cy = 90, r = 68, sw = 10;
  const fullArc = Math.PI * r;
  const filled = (score / 100) * fullArc;
  const empty = fullArc - filled;
  const arcColor = GAUGE_COLOR[color] || "#4ADE80";

  return (
    <svg viewBox="0 0 180 100" width="180" height="100" className="overflow-visible" aria-hidden="true">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#1e2a35"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      {score > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={arcColor}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${empty}`}
          style={{ filter: `drop-shadow(0 0 6px ${arcColor}80)` }}
        />
      )}
    </svg>
  );
}

function factorStatus(score: number, type: "hrv" | "sleep" | "load"): { label: string; color: string; dotColor: string } {
  if (type === "load") {
    if (score >= 70) return { label: "Moderada", color: "text-lime-400",   dotColor: "bg-lime-400" };
    if (score >= 40) return { label: "Alta",     color: "text-yellow-400", dotColor: "bg-yellow-400" };
    return                  { label: "Muy alta", color: "text-red-400",    dotColor: "bg-red-400" };
  }
  if (score >= 70) return { label: "Óptimo", color: "text-lime-400",   dotColor: "bg-lime-400" };
  if (score >= 50) return { label: "Bueno",  color: "text-yellow-400", dotColor: "bg-yellow-400" };
  return                  { label: "Bajo",   color: "text-red-400",    dotColor: "bg-red-400" };
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
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5 animate-pulse">
        <div className="h-3 bg-[#1e2a35] rounded w-1/3 mb-4" />
        <div className="flex justify-center">
          <div className="w-44 h-24 bg-[#1e2a35] rounded-full" />
        </div>
        <div className="flex gap-2 mt-4">
          <div className="flex-1 h-12 bg-[#1e2a35] rounded-xl" />
          <div className="flex-1 h-12 bg-[#1e2a35] rounded-xl" />
          <div className="flex-1 h-12 bg-[#1e2a35] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const textColor = TEXT_COLOR[data.color] || "text-lime-400";

  const factors: Array<{
    icon: string;
    name: string;
    value: number;
    display: string;
    type: "hrv" | "sleep" | "load";
  }> = [
    { icon: "🫀", name: "HRV",   value: data.hrv_score,   display: data.hrv ? `${data.hrv} ms` : `${data.hrv_score}`, type: "hrv" },
    { icon: "😴", name: "Sueño", value: data.sleep_score, display: `${(data.sleep_score / 10).toFixed(1)}h`,            type: "sleep" },
    { icon: "⚡", name: "Carga", value: data.load_score,  display: data.load_score >= 70 ? "Moderada" : data.load_score >= 40 ? "Alta" : "Muy alta", type: "load" },
  ];

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
          Training Readiness
        </p>
        {data.hrv && (
          <span className="text-slate-500 text-xs font-mono bg-[#1e2a35] px-2 py-0.5 rounded-full">
            HRV {data.hrv}ms
          </span>
        )}
      </div>

      {/* Gauge + score */}
      <div className="flex flex-col items-center -mb-2">
        <div className="relative">
          <GaugeSVG score={data.score} color={data.color} />
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

      {/* Factors */}
      <div className="mt-4 mb-3">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">Factores</p>
        <div className="space-y-2">
          {factors.map((f) => {
            const status = factorStatus(f.value, f.type);
            return (
              <div key={f.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{f.icon}</span>
                  <span className="text-slate-400 text-sm">{f.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-100 text-sm font-semibold font-mono">{f.display}</span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dotColor}`} />
                  <span className={`text-xs font-medium w-14 text-right ${status.color}`}>{status.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendation callout */}
      <div className="mt-4 bg-lime-400/5 border border-lime-400/20 rounded-xl p-3">
        <p className="text-lime-400 text-xs font-semibold mb-1">● RECOMENDACIÓN</p>
        <p className="text-slate-300 text-sm leading-snug">{data.recommendation}</p>
      </div>
    </div>
  );
}
