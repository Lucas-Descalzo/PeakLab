"use client"

interface LoadFocusData {
  base_aerobic_pct: number
  threshold_pct: number
  vo2max_pct: number
  deficit: "base" | "threshold" | "vo2max" | "balanced"
  deficit_label: string
  recommendation: string
  target_base_pct: number
}

interface Props {
  loadFocus: LoadFocusData
}

function ZoneBar({
  label,
  pct,
  target,
  color,
}: {
  label: string
  pct: number
  target: number
  color: string
}) {
  const isDeficit = pct < target * 0.8
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-slate-500 text-xs w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#1e2a35] rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${isDeficit ? "bg-red-400" : color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span
        className={`text-xs font-bold w-8 text-right ${isDeficit ? "text-red-400" : "text-slate-300"}`}
      >
        {pct}%
      </span>
    </div>
  )
}

export default function TrainingLoadFocus({ loadFocus }: Props) {
  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
        FOCO DE CARGA
      </p>

      <div className="mb-3">
        <ZoneBar
          label="BASE Z2"
          pct={loadFocus.base_aerobic_pct}
          target={loadFocus.target_base_pct}
          color="bg-lime-400"
        />
        <ZoneBar
          label="UMBRAL Z3-4"
          pct={loadFocus.threshold_pct}
          target={15}
          color="bg-yellow-400"
        />
        <ZoneBar
          label="VO2MAX Z5"
          pct={loadFocus.vo2max_pct}
          target={5}
          color="bg-blue-400"
        />
      </div>

      <p className="text-slate-600 text-xs mb-3">
        Target maratón: {loadFocus.target_base_pct}% / 15% / 5%
      </p>

      {loadFocus.deficit !== "balanced" && (
        <div className="mt-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3">
          <p className="text-yellow-400 text-xs font-semibold mb-1">
            ⚠️ {loadFocus.deficit_label}
          </p>
          <p className="text-slate-400 text-sm">{loadFocus.recommendation}</p>
        </div>
      )}
    </div>
  )
}
