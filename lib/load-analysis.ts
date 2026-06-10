/**
 * Lógica de análisis de carga, extraída de /api/load-analysis para poder
 * usarla directamente en Server Components (sin self-fetch por HTTP).
 */
import { getRecentActivities, getLatestWellness, getWellnessHistory } from "@/lib/db"
import { buildDailySeries, type DayMetrics } from "@/lib/performance-engine"
import { argentinaToday } from "@/lib/dates"
import {
  calcACWR,
  calcTrainingStatus,
  calcLoadFocus,
  calcHRVTrend,
} from "@/lib/training-readiness"

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

function buildSummary(
  acwr: ReturnType<typeof calcACWR>,
  trainingStatus: ReturnType<typeof calcTrainingStatus>
): string {
  if (acwr.acwr >= 0.8 && acwr.acwr <= 1.3 && trainingStatus.key === "productive") {
    return "Carga óptima. Esta semana podés subir el volumen 10-15%."
  }
  if (acwr.acwr > 1.5) {
    return "Carga muy elevada. Reducí el volumen inmediatamente y priorizá recuperación 2-3 días."
  }
  if (acwr.acwr > 1.3) {
    return "Carga elevada. Priorizá recuperación los próximos 2-3 días."
  }
  if (acwr.acwr < 0.8 && trainingStatus.key === "detraining") {
    return "Volumen bajo. Tu cuerpo puede absorber más carga esta semana."
  }
  if (acwr.acwr < 0.8 && trainingStatus.key === "peaking") {
    return "En forma y fresco. Momento ideal para competir o sesión de calidad."
  }
  if (trainingStatus.key === "maintaining") {
    return "Forma estable. Aumentá la carga gradualmente para seguir progresando."
  }
  if (trainingStatus.key === "overreaching") {
    return "Carga excesiva. Necesitás recuperación antes de retomar la intensidad."
  }
  return `ACWR ${acwr.acwr.toFixed(2)} — ${acwr.label}. ${acwr.recommendation}`
}

const STATIC = [
  { date: "2026-06-02", duration_s: 1812, avg_hr: 163, distance_m: 5554, name: "Easy Run" },
  { date: "2026-05-31", duration_s: 3486, avg_hr: 164, distance_m: 10324, name: "Long Run" },
  { date: "2026-05-28", duration_s: 2106, avg_hr: 167, distance_m: 6951, name: "Tempo" },
  { date: "2026-05-26", duration_s: 3187, avg_hr: 161, distance_m: 9500, name: "Base Run" },
  { date: "2026-05-24", duration_s: 2767, avg_hr: 154, distance_m: 7951, name: "Easy Run" },
  { date: "2026-05-22", duration_s: 4200, avg_hr: 148, distance_m: 13200, name: "Long Run fácil" },
  { date: "2026-05-20", duration_s: 1920, avg_hr: 155, distance_m: 5800, name: "Tempo corto" },
  { date: "2026-05-18", duration_s: 3000, avg_hr: 160, distance_m: 8900, name: "Base Run" },
]

export interface ACWRView {
  acwr: number
  atl: number
  ctl: number
  tsb: number
  status: "detraining" | "sweet_spot" | "caution" | "danger" | "insufficient"
  label: string
  color: string
  description: string
  recommendation: string
}

export interface LoadAnalysisResult {
  acwr: ACWRView
  training_status: ReturnType<typeof calcTrainingStatus>
  load_focus: ReturnType<typeof calcLoadFocus>
  hrv_trend: ReturnType<typeof calcHRVTrend> & { series: { date: string; hrv: number }[] }
  data_days: number
  weekly_volumes: { week: string; km: number; sessions: number }[]
  summary: string
  has_live_data: boolean
}

/**
 * ACWR desde la serie diaria del engine (días CALENDARIO, con ceros en días
 * de descanso). El cálculo legacy hacía EWMA sobre las últimas 7/28 SESIONES,
 * así que con poco historial sincronizado el ratio explotaba y declaraba
 * "sobreentrenamiento" falso. Además: si el historial cubre <14 días, el
 * ratio agudo/crónico no es estadísticamente válido → estado "insufficient".
 */
function acwrFromSeries(series: DayMetrics[], dataDays: number): ACWRView {
  const t = series[series.length - 1]
  const base = {
    acwr: t ? t.acwr : 0,
    atl: t ? t.atl : 0,
    ctl: t ? t.ctl : 0,
    tsb: t ? t.tsb : 0,
  }
  if (!t || dataDays < 14) {
    return {
      ...base,
      status: "insufficient",
      label: "Construyendo historial",
      color: "blue",
      description: `Hay ${dataDays} día/s de datos. El ACWR necesita ~4 semanas de historial para ser confiable.`,
      recommendation: "Sincronizá más histórico de Garmin (workflow con days=60) o seguí entrenando: en unos días esta métrica se vuelve precisa.",
    }
  }
  if (t.acwr > 1.5) return { ...base, status: "danger", label: "Zona peligrosa", color: "red",
    description: "Carga aguda muy alta vs tu base crónica. Riesgo real de lesión.",
    recommendation: "Reducí el volumen ya. 2-3 días de recuperación activa." }
  if (t.acwr > 1.3) return { ...base, status: "caution", label: "Precaución", color: "yellow",
    description: "Carga aguda elevada. Riesgo moderado de lesión.",
    recommendation: "Moderá la intensidad los próximos días. Priorizá sueño y nutrición." }
  if (t.acwr >= 0.8) return { ...base, status: "sweet_spot", label: "Zona óptima", color: "green",
    description: "Equilibrio ideal entre carga y recuperación.",
    recommendation: "Seguí el plan actual. Estás en la zona de mejor adaptación." }
  return { ...base, status: "detraining", label: "Subcarga", color: "blue",
    description: "Carga aguda baja respecto al fitness acumulado.",
    recommendation: "Podés aumentar el volumen sin riesgo." }
}

export async function computeLoadAnalysis(): Promise<LoadAnalysisResult> {
  const today = argentinaToday()

  const [activities, wellness, wellnessHistory] = await Promise.all([
    getRecentActivities(120).catch(() => []),
    getLatestWellness().catch(() => null),
    getWellnessHistory(28).catch(() => []),
  ])

  const activityData = activities.map((a) => ({
    date: a.date,
    duration_s: a.duration_s,
    avg_hr: a.avg_hr,
    distance_m: a.distance_m,
    name: a.name,
  }))

  const has_live_data = activityData.length > 0
  const data = has_live_data ? activityData : STATIC

  // Serie diaria real (días calendario) para ACWR/ATL/CTL/TSB
  const series = buildDailySeries(activities, today)
  const sortedDates = data.map((a) => a.date).sort()
  const data_days = has_live_data && series.length > 0 ? series.length : 0
  const acwr = has_live_data
    ? acwrFromSeries(series, data_days)
    : { ...calcACWR(data), status: calcACWR(data).status as ACWRView["status"] }
  void sortedDates

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0]
  const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split("T")[0]

  const recentLoad = data
    .filter((a) => a.date >= sevenDaysAgoStr)
    .reduce((s, a) => s + a.duration_s / 60, 0)
  const previousLoad = data
    .filter((a) => a.date >= fourteenDaysAgoStr && a.date < sevenDaysAgoStr)
    .reduce((s, a) => s + a.duration_s / 60, 0)

  const training_status = acwr.status === "insufficient"
    ? {
        key: "maintaining" as const,
        label: "Registrando datos",
        description: `Con ${data_days} día/s de historial todavía no se puede clasificar tu estado. Sincronizá más histórico o seguí entrenando.`,
        color: "blue",
        icon: "📈",
      }
    : calcTrainingStatus(
        { ...acwr, status: acwr.status as "detraining" | "sweet_spot" | "caution" | "danger" },
        recentLoad,
        previousLoad
      )
  const load_focus = calcLoadFocus(data)

  // FIX: antes se pasaba UNA sola entrada → promedio 7d siempre = valor de hoy
  // o 0. Ahora el historial real de 28 días alimenta tendencia Y sparkline.
  const wellnessEntries = wellnessHistory.length > 0
    ? wellnessHistory
    : wellness
    ? [{ date: wellness.date ?? today, hrv: wellness.hrv,
         hrv_baseline_lower: wellness.hrv_baseline_lower,
         hrv_baseline_upper: wellness.hrv_baseline_upper }]
    : []

  const hrvSeries = wellnessEntries
    .filter((w) => w.hrv && w.hrv > 0)
    .map((w) => ({ date: w.date, hrv: w.hrv as number }))

  const hrv_trend = { ...calcHRVTrend(wellnessEntries), series: hrvSeries }

  const weekMap = new Map<string, { km: number; sessions: number }>()
  for (const act of data) {
    const week = getISOWeek(new Date(act.date))
    const existing = weekMap.get(week) ?? { km: 0, sessions: 0 }
    weekMap.set(week, {
      km: existing.km + act.distance_m / 1000,
      sessions: existing.sessions + 1,
    })
  }

  const weekly_volumes = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, v]) => ({ week, km: Math.round(v.km * 10) / 10, sessions: v.sessions }))

  const summary = acwr.status === "insufficient"
    ? `Historial de ${data_days} día/s — las métricas de carga se afinan solas a medida que se acumulan datos. Para acelerarlo, corré el workflow con days=60.`
    : buildSummary(
        { ...acwr, status: acwr.status as "detraining" | "sweet_spot" | "caution" | "danger" },
        training_status
      )

  return { acwr, training_status, load_focus, hrv_trend, weekly_volumes, summary, has_live_data, data_days }
}
