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
      <div className="animate-pulse space-y-2.5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-[#1e2a35] rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-[#1e2a35] rounded w-1/3" />
            <div className="h-3 bg-[#1e2a35] rounded w-2/3" />
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 bg-[#1e2a35] rounded w-1/4" />
            <div className="h-3 bg-[#1e2a35] rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const scoreColorClass = SCORE_COLOR[data.color] || "text-lime-400";

  const factors: Array<{
    icon: string;
    name: string;
    value: number;
    display: string;
    type: "hrv" | "sleep" | "load";
  }> = [
    {
      icon: "🫀", name: "HRV",
      value: data.hrv_score,
      display: data.hrv ? `${data.hrv} ms` : `${data.hrv_score}`,
      type: "hrv",
    },
    {
      icon: "😴", name: "Sueño",
      value: data.sleep_score,
      display: `${(data.sleep_score / 10).toFixed(1)}h`,
      type: "sleep",
    },
    {
      icon: "⚡", name: "Carga",
      value: data.load_score,
      display: data.load_score >= 70 ? "Moderada" : data.load_score >= 40 ? "Alta" : "Muy alta",
      type: "load",
    },
  ];

  return (
    <div>
      {/* Score + label row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-[#080c10] rounded-xl border border-[#1e2a35]">
          <span className={`text-xl font-black leading-none ${scoreColorClass}`}>{data.score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-base leading-tight ${scoreColorClass}`}>{data.label}</p>
          <p className="text-slate-500 text-xs mt-0.5 leading-snug line-clamp-1">
            {data.recommendation}
          </p>
        </div>
      </div>

      {/* Factor rows — Athlos style */}
      <div className="space-y-2">
        {factors.map((f) => {
          const status = factorStatus(f.value, f.type);
          return (
            <div key={f.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">{f.icon}</span>
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
  );
}
