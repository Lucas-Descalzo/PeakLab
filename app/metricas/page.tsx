export const dynamic = "force-dynamic"

import { getRecentActivities, getLatestWellness } from "@/lib/db"
import ProgressScreen from "@/components/screens/ProgressScreen"
import TrainingLoadChart from "@/components/TrainingLoadChart"
import ACWRCard from "@/components/ACWRCard"
import TrainingLoadFocus from "@/components/TrainingLoadFocus"
import TrainingStatusBadge from "@/components/TrainingStatusBadge"
import HRVTrendCard from "@/components/HRVTrendCard"

const STATIC_ACTIVITIES = [
  { date: "2026-06-02", name: "VO2 máximo",  distance_m: 5554,  duration_s: 1812, avg_hr: 163, training_effect: 3.5 },
  { date: "2026-05-31", name: "Base",         distance_m: 10324, duration_s: 3486, avg_hr: 164, training_effect: 4.0 },
  { date: "2026-05-28", name: "Tempo",        distance_m: 6951,  duration_s: 2106, avg_hr: 167, training_effect: 4.1 },
  { date: "2026-05-26", name: "Base",         distance_m: 9500,  duration_s: 3187, avg_hr: 161, training_effect: 4.1 },
  { date: "2026-05-24", name: "Base",         distance_m: 7951,  duration_s: 2767, avg_hr: 154, training_effect: 3.5 },
  { date: "2026-05-10", name: "Media Maratón Ciudad", distance_m: 21357, duration_s: 6936, avg_hr: 174, training_effect: 5.0 },
]

const DEMO_LOAD = {
  acwr: {
    acwr: 0.78, atl: 18, ctl: 23, tsb: 5,
    status: "sweet_spot" as const,
    label: "Zona óptima", color: "lime",
    description: "Podés incrementar carga.",
    recommendation: "Tu cuerpo puede absorber más volumen esta semana.",
  },
  training_status: { key: "productive", label: "Productivo", description: "Carga y fitness en equilibrio ideal.", color: "lime", icon: "⚡" },
  load_focus: {
    base_aerobic_pct: 25, threshold_pct: 65, vo2max_pct: 10,
    deficit: "base" as const, deficit_label: "Déficit de base Z2",
    recommendation: "El 65% de tus km deberían ser Z2 (HR < 140). Estás corriendo demasiado rápido en salidas fáciles.",
    target_base_pct: 80,
  },
  hrv_trend: {
    current: 77, average7d: 82, trend: "stable" as const, trend_label: "Estable",
    baseline_lower: 55, baseline_upper: 99,
  },
  summary: "Carga baja — podés subir el volumen 15-20% esta semana sin riesgo.",
}

const PERSONAL_RECORDS = [
  { icon: "🏃", dist: "Mejor 1km",     time: "4:09",    date: "may 2026" },
  { icon: "⚡", dist: "Mejor 5K",      time: "24:17",   date: "nov 2025" },
  { icon: "🔟", dist: "Mejor 10K",     time: "49:41",   date: "nov 2025" },
  { icon: "🏅", dist: "Media maratón", time: "1:51:42", date: "ago 2025" },
]

export default async function MetricasPage() {
  const [liveActivities, wellness, loadAnalysisRaw] = await Promise.all([
    getRecentActivities(10),
    getLatestWellness(),
    process.env.NEXT_PUBLIC_APP_URL
      ? fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/load-analysis`, {
          cache: "no-store", next: { revalidate: 21600 },
        }).then(r => r.json()).catch(() => null)
      : Promise.resolve(null),
  ])

  const loadAnalysis = loadAnalysisRaw ?? DEMO_LOAD
  const activities = liveActivities.length > 0 ? liveActivities : STATIC_ACTIVITIES
  const hasLiveData = liveActivities.length > 0

  return (
    <div className="space-y-6">
      {/* Overview tabs (summary charts + predictions) */}
      <ProgressScreen />

      {/* Advanced Metrics */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Métricas avanzadas</p>
        <div className="grid grid-cols-1 gap-3">
          <TrainingStatusBadge trainingStatus={loadAnalysis.training_status} size="md" />
          <ACWRCard acwr={loadAnalysis.acwr} />
        </div>
        <TrainingLoadFocus loadFocus={loadAnalysis.load_focus} />
        <HRVTrendCard hrvTrend={loadAnalysis.hrv_trend} />
        <div className="bg-lime-400/5 border border-lime-400/20 rounded-xl p-3">
          <p className="text-lime-400 text-xs font-semibold mb-1">● RESUMEN DE CARGA</p>
          <p className="text-slate-300 text-sm">{loadAnalysis.summary}</p>
        </div>
      </div>

      {/* Activity log */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Últimas corridas{hasLiveData && <span className="text-green-400 normal-case font-normal"> ● live</span>}
        </h2>
        <div className="space-y-2">
          {activities.map((a, i) => {
            const km = (a.distance_m / 1000).toFixed(1)
            const paceRaw = a.distance_m > 0 ? a.duration_s / (a.distance_m / 1000) : 0
            const pace = paceRaw > 0
              ? `${Math.floor(paceRaw / 60)}:${String(Math.round(paceRaw % 60)).padStart(2, "0")}`
              : "--"
            const te = (a as { training_effect?: number }).training_effect ?? null
            return (
              <div key={i} className="bg-[#0f1419] border border-[#1e2a35] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-slate-200 text-sm font-semibold">{a.name}</p>
                  <p className="text-slate-500 text-xs">{a.date}</p>
                </div>
                <div className="flex gap-5 text-right">
                  <div>
                    <p className="text-slate-200 text-sm font-bold">{km}km</p>
                    <p className="text-slate-500 text-xs">{pace}/km</p>
                  </div>
                  <div>
                    <p className="text-slate-200 text-sm font-bold">{a.avg_hr} bpm</p>
                    {te !== null && <p className="text-slate-500 text-xs">TE {te}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <TrainingLoadChart />

      {/* Personal Records */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Récords personales</h2>
        <div className="space-y-2">
          {PERSONAL_RECORDS.map(pr => (
            <div key={pr.dist} className="flex items-center justify-between py-1.5 border-b border-[#1e2a35] last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{pr.icon}</span>
                <span className="text-slate-300 text-sm">{pr.dist}</span>
              </div>
              <div className="text-right">
                <span className="text-lime-400 font-bold text-sm font-mono">{pr.time}</span>
                <span className="text-slate-600 text-xs ml-2">{pr.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!hasLiveData && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <p className="text-yellow-400 text-xs font-semibold mb-0.5">Sync pendiente</p>
          <p className="text-yellow-500/70 text-xs">Datos estáticos. Conectá Garmin para ver métricas en tiempo real.</p>
        </div>
      )}
    </div>
  )
}
