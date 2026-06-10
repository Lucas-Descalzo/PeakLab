/**
 * PeakLab Performance Engine
 * ──────────────────────────
 * Pipeline de analítica avanzada sobre los datos crudos de Garmin en Redis.
 *
 * 1. MOTOR DE CARGA Y FATIGA (modelo de Banister modificado)
 *    - TRIMP por sesión: Edwards (minutos en zona × factor 1-5) si hay zonas
 *      de FC sincronizadas; si no, Banister exponencial con HRrest/HRmax.
 *    - CTL (Fitness): EWMA de la carga diaria con constante de tiempo 28 días.
 *      CTL_t = CTL_{t-1} + (load_t − CTL_{t-1}) × (1/28)
 *    - ATL (Fatigue): ídem con constante 7 días.
 *    - TSB (Form): TSB_t = CTL_{t-1} − ATL_{t-1}  (fitness y fatiga de AYER,
 *      convención TrainingPeaks: la forma de hoy no incluye la sesión de hoy).
 *
 * 2. ACWR (Acute:Chronic Workload Ratio)
 *    - EWMA 7d / EWMA 28d por día (método "coupled" de Williams et al.).
 *    - Zonas: <0.8 subcarga · 0.8-1.3 sweet spot · 1.3-1.5 precaución · >1.5 peligro.
 *
 * 3. READINESS SCORE SINTÉTICO (0-100), suma ponderada:
 *    - 30% HRV: z-score de la HRV nocturna vs baseline móvil de 21 días
 *      (media μ y desvío σ del historial). score = clamp(75 + 25·z, 0, 100).
 *    - 25% Carga: índice por TSB del día (−30→0 pts, +10→100 pts),
 *      con tope de 30 pts si el ACWR de ayer superó 1.5.
 *    - 20% Sueño: Sleep Score de Garmin de anoche (0-100 directo).
 *    - 15% Estrés: nivel medio de estrés de ayer, invertido
 *      (estrés 0→100 pts, estrés 80+→0 pts).
 *    - 10% Deuda de sueño: media de horas de las últimas 3 noches vs
 *      objetivo de 8h. score = clamp(promedio/8 × 100, 0, 100).
 *    Componentes sin datos se excluyen y los pesos restantes se renormalizan,
 *    así un día sin lectura de estrés no castiga el score.
 */
import { getRecentActivities, getWellnessHistory, type ActivityEntry, type WellnessEntry } from "@/lib/db"
import { argentinaToday } from "@/lib/dates"

const HR_MAX = 201
const HR_REST = 45
const SLEEP_TARGET_H = 8
const CTL_TC = 28 // días — pedido explícito (TrainingPeaks usa 42)
const ATL_TC = 7

// ── TRIMP ─────────────────────────────────────────────────────────────────────

const EDWARDS_FACTORS = [1, 2, 3, 4, 5]

export function calcSessionTRIMP(a: Pick<ActivityEntry,
  "duration_s" | "avg_hr" | "zone_1_s" | "zone_2_s" | "zone_3_s" | "zone_4_s" | "zone_5_s" | "trimp"
>): number {
  // 0. Si la ruta de sync ya lo calculó, usarlo
  if (a.trimp && a.trimp > 0) return a.trimp

  // 1. Edwards TRIMP si hay tiempo en zonas (más fiel a la sesión real)
  const zones: number[] = [a.zone_1_s ?? 0, a.zone_2_s ?? 0, a.zone_3_s ?? 0, a.zone_4_s ?? 0, a.zone_5_s ?? 0]
  if (zones.some((z) => z > 0)) {
    return Math.round(
      zones.reduce((sum: number, z, i) => sum + (z / 60) * (EDWARDS_FACTORS[i] ?? 1), 0)
    )
  }

  // 2. Banister bTRIMP exponencial (fallback con FC media)
  if (!a.avg_hr || a.avg_hr <= HR_REST || !a.duration_s) return 0
  const ratio = (a.avg_hr - HR_REST) / (HR_MAX - HR_REST)
  return Math.round((a.duration_s / 60) * ratio * 0.64 * Math.exp(1.92 * ratio))
}

// ── Serie diaria ──────────────────────────────────────────────────────────────

export interface DayMetrics {
  date: string
  load: number        // TRIMP total del día
  ctl: number         // fitness (EWMA 28d)
  atl: number         // fatiga (EWMA 7d)
  tsb: number         // forma = CTL_ayer − ATL_ayer
  acwr: number        // EWMA7 / EWMA28
  acwr_zone: "subcarga" | "sweet_spot" | "precaucion" | "peligro"
}

function acwrZone(acwr: number): DayMetrics["acwr_zone"] {
  if (acwr > 1.5) return "peligro"
  if (acwr > 1.3) return "precaucion"
  if (acwr >= 0.8) return "sweet_spot"
  return "subcarga"
}

function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  const d = new Date(`${from}T12:00:00Z`)
  const end = new Date(`${to}T12:00:00Z`)
  while (d <= end) {
    out.push(d.toISOString().split("T")[0])
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

/**
 * Construye la serie diaria CTL/ATL/TSB/ACWR a partir de las actividades.
 * Estructura óptima: un registro por día calendario (los días sin entrenar
 * cuentan con load=0 — esencial para que las EWMA decaigan correctamente).
 */
export function buildDailySeries(activities: ActivityEntry[], today: string): DayMetrics[] {
  if (activities.length === 0) return []

  const loadByDay = new Map<string, number>()
  for (const a of activities) {
    loadByDay.set(a.date, (loadByDay.get(a.date) ?? 0) + calcSessionTRIMP(a))
  }

  const firstDate = [...loadByDay.keys()].sort()[0]
  const days = dateRange(firstDate, today)

  const lambdaCtl = 1 / CTL_TC
  const lambdaAtl = 1 / ATL_TC

  let ctl = 0
  let atl = 0
  const series: DayMetrics[] = []

  for (const date of days) {
    const load = loadByDay.get(date) ?? 0
    const prevCtl = ctl
    const prevAtl = atl
    ctl = ctl + (load - ctl) * lambdaCtl
    atl = atl + (load - atl) * lambdaAtl
    const tsb = prevCtl - prevAtl
    const acwr = ctl > 1 ? atl / ctl : 0
    series.push({
      date,
      load: Math.round(load),
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      acwr: Math.round(acwr * 100) / 100,
      acwr_zone: acwrZone(acwr),
    })
  }
  return series
}

// ── Readiness sintético ───────────────────────────────────────────────────────

export interface ReadinessComponent {
  key: "hrv" | "load" | "sleep_quality" | "stress" | "sleep_debt"
  label: string
  weight: number       // peso nominal
  score: number | null // 0-100, null = sin datos
  detail: string
}

export interface ReadinessResult {
  score: number              // 0-100
  label: string
  color: string
  components: ReadinessComponent[]
  recommendation: string
}

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v))

export function calcSyntheticReadiness(
  wellnessHistory: WellnessEntry[],   // ascendente; el último es "anoche/hoy"
  series: DayMetrics[],               // ascendente; el último es hoy
): ReadinessResult {
  const latest = wellnessHistory[wellnessHistory.length - 1]
  const todayMetrics = series[series.length - 1]
  const yesterdayMetrics = series.length >= 2 ? series[series.length - 2] : todayMetrics

  // 30% — HRV vs baseline 21d
  let hrvScore: number | null = null
  let hrvDetail = "Sin lectura de HRV"
  const hrvSamples = wellnessHistory.slice(-21).map((w) => w.hrv).filter((h): h is number => !!h)
  if (latest?.hrv && hrvSamples.length >= 3) {
    const mu = hrvSamples.reduce((s, v) => s + v, 0) / hrvSamples.length
    const sigma = Math.sqrt(hrvSamples.reduce((s, v) => s + (v - mu) ** 2, 0) / hrvSamples.length) || 1
    const z = (latest.hrv - mu) / sigma
    hrvScore = Math.round(clamp(75 + 25 * z))
    hrvDetail = `HRV ${latest.hrv}ms vs baseline ${mu.toFixed(0)}±${sigma.toFixed(0)}ms (z=${z.toFixed(2)})`
  } else if (latest?.hrv && latest.hrv_baseline_lower && latest.hrv_baseline_upper) {
    // Fallback: rango de baseline que reporta Garmin si hay poco historial
    const pct = (latest.hrv - latest.hrv_baseline_lower) /
      (latest.hrv_baseline_upper - latest.hrv_baseline_lower)
    hrvScore = Math.round(clamp(pct * 100))
    hrvDetail = `HRV ${latest.hrv}ms en rango Garmin ${latest.hrv_baseline_lower}-${latest.hrv_baseline_upper}ms`
  }

  // 25% — carga acumulada (TSB de hoy, penalizado por ACWR de ayer)
  let loadScore: number | null = null
  let loadDetail = "Sin historial de carga"
  if (todayMetrics) {
    // TSB −30 → 0 pts · TSB +10 → 100 pts (lineal)
    loadScore = Math.round(clamp(((todayMetrics.tsb + 30) / 40) * 100))
    loadDetail = `TSB ${todayMetrics.tsb} (CTL ${todayMetrics.ctl} / ATL ${todayMetrics.atl})`
    if (yesterdayMetrics && yesterdayMetrics.acwr > 1.5) {
      loadScore = Math.min(loadScore, 30)
      loadDetail += ` · ACWR ayer ${yesterdayMetrics.acwr} ⚠ pico de carga`
    }
  }

  // 20% — calidad de sueño (score Garmin de anoche)
  let sleepScore: number | null = null
  let sleepDetail = "Sin score de sueño"
  if (latest?.sleep_score) {
    sleepScore = clamp(latest.sleep_score)
    sleepDetail = `Sleep score ${latest.sleep_score}/100`
  } else if (latest?.sleep_total_s) {
    const h = latest.sleep_total_s / 3600
    sleepScore = Math.round(clamp((h / SLEEP_TARGET_H) * 90))
    sleepDetail = `${h.toFixed(1)}h dormidas (sin score Garmin)`
  }

  // 15% — estrés medio del día previo (invertido)
  let stressScore: number | null = null
  let stressDetail = "Sin datos de estrés"
  const prevWithStress = [...wellnessHistory].reverse().find((w) => w.stress_avg !== undefined)
  if (prevWithStress?.stress_avg !== undefined && prevWithStress.stress_avg >= 0) {
    stressScore = Math.round(clamp(100 - prevWithStress.stress_avg * 1.25))
    stressDetail = `Estrés medio ${prevWithStress.stress_avg}/100 (${prevWithStress.date})`
  }

  // 10% — deuda de sueño (media 3 noches vs objetivo 8h)
  let debtScore: number | null = null
  let debtDetail = "Sin historial de sueño"
  const last3 = wellnessHistory.slice(-3).map((w) => w.sleep_total_s).filter((s): s is number => !!s)
  if (last3.length > 0) {
    const avgH = last3.reduce((s, v) => s + v, 0) / last3.length / 3600
    debtScore = Math.round(clamp((avgH / SLEEP_TARGET_H) * 100))
    debtDetail = `Media ${avgH.toFixed(1)}h/noche (${last3.length} noches) vs objetivo ${SLEEP_TARGET_H}h`
  }

  const components: ReadinessComponent[] = [
    { key: "hrv", label: "HRV vs baseline 21d", weight: 0.30, score: hrvScore, detail: hrvDetail },
    { key: "load", label: "Carga acumulada (TSB/ACWR)", weight: 0.25, score: loadScore, detail: loadDetail },
    { key: "sleep_quality", label: "Calidad de sueño", weight: 0.20, score: sleepScore, detail: sleepDetail },
    { key: "stress", label: "Estrés diario", weight: 0.15, score: stressScore, detail: stressDetail },
    { key: "sleep_debt", label: "Deuda de sueño 3d", weight: 0.10, score: debtScore, detail: debtDetail },
  ]

  // Suma ponderada renormalizando sobre componentes con datos
  const available = components.filter((c) => c.score !== null)
  const totalWeight = available.reduce((s, c) => s + c.weight, 0)
  const score = totalWeight > 0
    ? Math.round(available.reduce((s, c) => s + (c.score! * c.weight), 0) / totalWeight)
    : 50

  let label: string, color: string, recommendation: string
  if (score >= 80) {
    label = "Óptimo"; color = "green"
    recommendation = "Día ideal para sesión de calidad o long run exigente."
  } else if (score >= 65) {
    label = "Bueno"; color = "lime"
    recommendation = "Podés entrenar según el plan sin ajustes."
  } else if (score >= 50) {
    label = "Moderado"; color = "yellow"
    recommendation = "Entrená, pero bajá un punto la intensidad si te sentís pesado."
  } else {
    label = "Bajo"; color = "red"
    recommendation = "Priorizá recuperación: Z1 corto, movilidad o descanso total."
  }

  return { score, label, color, components, recommendation }
}

// ── Orquestador ───────────────────────────────────────────────────────────────

export interface PerformanceSnapshot {
  date: string
  readiness: ReadinessResult
  today: DayMetrics | null
  series: DayMetrics[]          // últimos 60 días para gráficos
  has_live_data: boolean
}

export async function computePerformance(): Promise<PerformanceSnapshot> {
  const today = argentinaToday()
  const [activities, wellnessHistory] = await Promise.all([
    getRecentActivities(120).catch(() => []),
    getWellnessHistory(28).catch(() => []),
  ])

  const series = buildDailySeries(activities, today)
  const readiness = calcSyntheticReadiness(wellnessHistory, series)

  return {
    date: today,
    readiness,
    today: series[series.length - 1] ?? null,
    series: series.slice(-60),
    has_live_data: activities.length > 0,
  }
}
