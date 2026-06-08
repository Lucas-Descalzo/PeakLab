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

const COLOR_MAP: Record<string, string> = {
  green:  "text-green-400",
  lime:   "text-lime-400",
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  red:    "text-red-400",
};

const BAR_COLOR: Record<string, string> = {
  green:  "bg-green-500",
  lime:   "bg-lime-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  red:    "bg-red-500",
};

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
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-1/3 mb-2" />
        <div className="h-8 bg-zinc-800 rounded w-1/2" />
      </div>
    );
  }

  if (!data) return null;

  const textColor = COLOR_MAP[data.color] || "text-zinc-300";
  const barColor = BAR_COLOR[data.color] || "bg-zinc-500";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-zinc-400 text-sm font-medium">Training Readiness</p>
        {data.hrv && (
          <span className="text-zinc-500 text-xs">HRV {data.hrv}ms</span>
        )}
      </div>

      <div className="flex items-end gap-3 mb-3">
        <span className={`text-4xl font-bold ${textColor}`}>{data.score}</span>
        <span className={`text-lg font-medium mb-1 ${textColor}`}>{data.label}</span>
      </div>

      {/* Score bar */}
      <div className="h-2 bg-zinc-800 rounded-full mb-3">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${data.score}%` }}
        />
      </div>

      <p className="text-zinc-400 text-sm mb-4">{data.recommendation}</p>

      {/* Sub-scores */}
      <div className="grid grid-cols-3 gap-2">
        <SubScore label="HRV" value={data.hrv_score} />
        <SubScore label="Sueño" value={data.sleep_score} />
        <SubScore label="Carga" value={data.load_score} />
      </div>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "text-green-400" : value >= 50 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="bg-zinc-800 rounded-xl p-2 text-center">
      <p className={`font-bold text-lg ${color}`}>{value}</p>
      <p className="text-zinc-500 text-xs">{label}</p>
    </div>
  );
}
