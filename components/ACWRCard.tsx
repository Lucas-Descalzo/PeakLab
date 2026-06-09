"use client"

interface ACWRData {
  acwr: number
  atl: number
  ctl: number
  tsb: number
  status: "detraining" | "sweet_spot" | "caution" | "danger"
  label: string
  color: string
  description: string
  recommendation: string
}

interface Props {
  acwr: ACWRData
}

export default function ACWRCard({ acwr }: Props) {
  const MAX_ACWR = 1.8
  const indicatorPct = Math.min((acwr.acwr / MAX_ACWR) * 100, 98)

  const statusColorMap: Record<string, string> = {
    detraining: "text-blue-400",
    sweet_spot: "text-lime-400",
    caution: "text-yellow-400",
    danger: "text-red-400",
  }

  const valueColor = statusColorMap[acwr.status] ?? "text-lime-400"

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
        ACWR — RATIO DE CARGA
      </p>

      {/* Value + Status */}
      <div className="flex items-baseline justify-between mb-4">
        <span className={`text-4xl font-black ${valueColor}`}>
          {acwr.acwr.toFixed(2)}
        </span>
        <span className={`text-sm font-semibold ${valueColor}`}>
          {acwr.label}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="mb-1 relative">
        <svg width="100%" height="20" className="overflow-visible">
          {/* Segment: Detraining 0-0.8 => 0-44% */}
          <rect x="0%" width="44%" height="8" rx="4" fill="#3b82f6" opacity="0.6" />
          {/* Segment: Sweet spot 0.8-1.3 => 44-72% */}
          <rect x="44%" width="28%" height="8" rx="0" fill="#4ADE80" opacity="0.8" />
          {/* Segment: Caution 1.3-1.5 => 72-83% */}
          <rect x="72%" width="11%" height="8" rx="0" fill="#fbbf24" opacity="0.8" />
          {/* Segment: Danger 1.5+ => 83-100% */}
          <rect x="83%" width="17%" height="8" rx="4" fill="#f87171" opacity="0.8" />
          {/* Indicator */}
          <circle
            cx={`${indicatorPct}%`}
            cy="4"
            r="6"
            fill="white"
            stroke="#0f1419"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-slate-600 text-xs mb-4">
        <span>0.0</span>
        <span>0.8</span>
        <span>1.0</span>
        <span>1.3</span>
        <span>1.5+</span>
      </div>

      {/* Zone labels */}
      <div className="flex justify-between text-xs mb-4">
        <span className="text-blue-400/70">← Detraining</span>
        <span className="text-lime-400/70">Óptimo</span>
        <span className="text-yellow-400/70">Precaución</span>
        <span className="text-red-400/70">Riesgo →</span>
      </div>

      {/* Recommendation */}
      <p className="text-slate-300 text-sm leading-snug">{acwr.recommendation}</p>

      {/* ATL / CTL / TSB mini row */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-[#1e2a35]">
        <div>
          <p className="text-slate-600 text-xs">ATL</p>
          <p className="text-slate-300 text-sm font-semibold">{acwr.atl}</p>
        </div>
        <div>
          <p className="text-slate-600 text-xs">CTL</p>
          <p className="text-slate-300 text-sm font-semibold">{acwr.ctl}</p>
        </div>
        <div>
          <p className="text-slate-600 text-xs">TSB</p>
          <p className={`text-sm font-semibold ${acwr.tsb >= 0 ? "text-lime-400" : "text-red-400"}`}>
            {acwr.tsb > 0 ? "+" : ""}{acwr.tsb}
          </p>
        </div>
      </div>
    </div>
  )
}
