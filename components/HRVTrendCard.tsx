"use client"
import InfoHint from "@/components/ui/InfoHint"

interface HRVTrendData {
  current: number
  average7d: number
  trend: "improving" | "stable" | "declining"
  trend_label: string
  baseline_lower: number
  baseline_upper: number
  series?: { date: string; hrv: number }[]
}

interface Props {
  hrvTrend: HRVTrendData
}

const TREND_COLORS: Record<string, string> = {
  improving: "text-lime-400",
  stable: "text-yellow-400",
  declining: "text-red-400",
}

const TREND_ARROWS: Record<string, string> = {
  improving: "↑",
  stable: "→",
  declining: "↓",
}

// El sparkline usa SOLO datos reales del historial. Si no hay suficientes
// puntos, no se dibuja línea (antes se inventaba una curva decorativa que
// contradecía el "promedio 7d: 0ms").

export default function HRVTrendCard({ hrvTrend }: Props) {
  const trendColor = TREND_COLORS[hrvTrend.trend] ?? "text-yellow-400"
  const arrow = TREND_ARROWS[hrvTrend.trend] ?? "→"

  const points = (hrvTrend.series ?? []).slice(-28).map((p) => p.hrv)
  const hasSeries = points.length >= 2
  const minVal = hasSeries ? Math.min(...points, hrvTrend.baseline_lower || Infinity) : 0
  const maxVal = hasSeries ? Math.max(...points, hrvTrend.baseline_upper || -Infinity) : 1
  const range = maxVal - minVal || 1

  const svgW = 300
  const svgH = 40

  const polyPoints = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * svgW
      const y = svgH - ((v - minVal) / range) * svgH
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          VFC — TENDENCIA 4 SEMANAS
        </p>
        <InfoHint
          title="¿Qué es la VFC?"
          text={"Variabilidad de la Frecuencia Cardíaca (HRV en inglés): variación en milisegundos entre latido y latido, medida mientras dormís.\n\nVFC alta y estable = tu sistema nervioso se recupera bien. Una caída sostenida bajo tu baseline indica fatiga, estrés o enfermedad incubando.\n\nLa banda gris del gráfico es tu rango normal personal."}
        />
      </div>

      {/* Current value + trend */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <span className="text-4xl font-black text-slate-100">{hrvTrend.current}</span>
          <span className="text-slate-500 text-sm ml-1">ms</span>
          <p className="text-slate-500 text-xs mt-0.5">Hoy</p>
        </div>
        <div className="text-right">
          <p className={`text-base font-bold ${trendColor}`}>
            {arrow} {hrvTrend.trend_label}
          </p>
          <p className="text-slate-500 text-xs">vs. semana pasada</p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mb-4">
        {!hasSeries && (
          <p className="text-slate-600 text-xs italic py-3">
            Registrando historial de VFC — el gráfico aparece con 2+ días de datos.
          </p>
        )}
        {hasSeries && <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          width="100%"
          height={svgH}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          {/* Baseline band */}
          {(() => {
            const upperY = svgH - ((hrvTrend.baseline_upper - minVal) / range) * svgH
            const lowerY = svgH - ((hrvTrend.baseline_lower - minVal) / range) * svgH
            const clampedUpperY = Math.max(0, upperY)
            const clampedLowerY = Math.min(svgH, lowerY)
            const bandHeight = clampedLowerY - clampedUpperY
            if (bandHeight > 0) {
              return (
                <rect
                  x="0"
                  y={clampedUpperY}
                  width={svgW}
                  height={bandHeight}
                  fill="#1e2a35"
                  opacity="0.5"
                />
              )
            }
            return null
          })()}
          {/* Sparkline */}
          <polyline
            points={polyPoints}
            fill="none"
            stroke="#4ADE80"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* End dot */}
          {(() => {
            const lastX = svgW
            const lastY = svgH - ((hrvTrend.current - minVal) / range) * svgH
            return <circle cx={lastX} cy={lastY} r="3" fill="#4ADE80" />
          })()}
        </svg>}
      </div>

      {/* Footer stats */}
      <div className="flex justify-between text-xs pt-3 border-t border-[#1e2a35]">
        <div>
          <span className="text-slate-500">Promedio 7d: </span>
          <span className="text-slate-300 font-semibold">{hrvTrend.average7d}ms</span>
        </div>
        <div>
          <span className="text-slate-500">Baseline: </span>
          <span className="text-slate-300 font-semibold">
            {hrvTrend.baseline_lower}–{hrvTrend.baseline_upper}
          </span>
        </div>
      </div>
    </div>
  )
}
