import { NextResponse } from "next/server"
import { getRecentActivities, getLatestWellness } from "@/lib/db"
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

export async function GET() {
  const today = new Date().toISOString().split("T")[0]
  const cacheKey = `load-analysis:${today}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let redis: any = null
  try {
    const { Redis } = await import("@upstash/redis")
    if (process.env.UPSTASH_REDIS_REST_URL?.startsWith("http")) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json({ ...JSON.parse(cached as string), cached: true })
      }
    }
  } catch {}

  // Fetch data
  const [activities, wellness] = await Promise.all([
    getRecentActivities(60).catch(() => []),
    getLatestWellness().catch(() => null),
  ])

  // Map to ActivityData shape (with optional name for zone estimation)
  const activityData = activities.map((a) => ({
    date: a.date,
    duration_s: a.duration_s,
    avg_hr: a.avg_hr,
    distance_m: a.distance_m,
    name: a.name,
  }))

  // Fallback static data for demo when no real data
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

  const data = activityData.length > 0 ? activityData : STATIC

  // Compute metrics
  const acwr = calcACWR(data)

  // Recent vs previous load: compare last 7d ATL vs 7-14d window
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0]
  const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split("T")[0]

  const recentActs = data.filter((a) => a.date >= sevenDaysAgoStr)
  const previousActs = data.filter((a) => a.date >= fourteenDaysAgoStr && a.date < sevenDaysAgoStr)

  const recentLoad = recentActs.reduce((s, a) => s + a.duration_s / 60, 0)
  const previousLoad = previousActs.reduce((s, a) => s + a.duration_s / 60, 0)

  const training_status = calcTrainingStatus(acwr, recentLoad, previousLoad)
  const load_focus = calcLoadFocus(data)

  // HRV trend: build wellness entries array
  // We only have one wellness entry available via getLatestWellness; use it if present
  const wellnessEntries = wellness
    ? [
        {
          date: wellness.date ?? today,
          hrv: wellness.hrv,
          hrv_baseline_lower: wellness.hrv_baseline_lower,
          hrv_baseline_upper: wellness.hrv_baseline_upper,
        },
      ]
    : [
        { date: today, hrv: 77, hrv_baseline_lower: 55, hrv_baseline_upper: 99 },
      ]

  const hrv_trend = calcHRVTrend(wellnessEntries)

  // Weekly volumes: last 8 weeks
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

  const summary = buildSummary(acwr, training_status)

  const result = {
    acwr,
    training_status,
    load_focus,
    hrv_trend,
    weekly_volumes,
    summary,
  }

  // Cache for 6 hours
  try {
    if (redis) {
      const ttl = 6 * 60 * 60
      await redis.set(cacheKey, JSON.stringify(result), { ex: ttl })
    }
  } catch {}

  return NextResponse.json({ ...result, cached: false })
}
