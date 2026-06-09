"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Heart, Moon, Activity, Check, AlertTriangle, MessageCircle } from "lucide-react"
import Pill from "@/components/ui/Pill"
import type { PlannedWorkout } from "@/lib/training-plan"

interface DailyBrief {
  score: number
  status: string
  recommendation: string
  why: string
  focus: string
  action: string
  color: string
}

interface HomeScreenProps {
  todayWorkout: PlannedWorkout | null
  currentWeek: number
}

const RACE_A = new Date("2026-08-23")
const RACE_B = new Date("2026-09-20")

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000)
}

// Mon/Wed/Fri = gym, Tue/Thu/Sun = run, Sat = rest
const DAY_TYPE: Record<number, "gym" | "run" | "rest"> = {
  0: "run", 1: "gym", 2: "run", 3: "gym", 4: "run", 5: "gym", 6: "rest",
}
const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"]

export default function HomeScreen({ todayWorkout, currentWeek }: HomeScreenProps) {
  const [brief, setBrief] = useState<DailyBrief | null>(null)
  const [scoreAnim, setScoreAnim] = useState(0)

  useEffect(() => {
    fetch("/api/daily-brief")
      .then(r => r.json())
      .then((d: DailyBrief) => setBrief(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!brief) return
    const target = brief.score
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 1000, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setScoreAnim(Math.round(ease * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [brief])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 13) return "Buenos días"
    if (h < 20) return "Buenas tardes"
    return "Buenas noches"
  })()

  const today = new Date()
  const todayDow = today.getDay() // 0=Sun

  // Build 7-day week strip anchored on Monday
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + mondayOffset + i)
    return { dow: d.getDay(), isToday: d.toDateString() === today.toDateString() }
  })

  const scoreColor = brief?.color === "yellow" || brief?.color === "orange"
    ? "text-yellow-400"
    : brief?.color === "red"
    ? "text-red-400"
    : "text-lime-400"

  const strokePct = brief ? scoreAnim / 100 : 0
  const circumference = 2 * Math.PI * 28

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
            {today.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
          </p>
          <p className="text-slate-100 text-xl font-bold mt-0.5">{greeting}, Lucas</p>
        </div>
        <Link
          href="/mas"
          className="w-10 h-10 rounded-full bg-lime-400/10 border border-lime-400/25 flex items-center justify-center"
        >
          <span className="text-lime-400 font-bold text-base">L</span>
        </Link>
      </div>

      {/* Peak Score Hero */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-3xl overflow-hidden">
        {/* Score + ring */}
        <div className="p-5">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">
            Peak Score
          </p>
          {brief ? (
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-8xl font-black leading-none ${scoreColor}`}>
                    {scoreAnim}
                  </span>
                  <span className="text-slate-500 text-lg mb-2">/100</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  <span className="text-slate-100 font-semibold text-base">{brief.status}</span>
                </div>
              </div>
              <svg width="68" height="68" viewBox="0 0 68 68" className="flex-shrink-0 mt-1">
                <circle cx="34" cy="34" r="28" fill="none" stroke="#1e2a35" strokeWidth="3.5" />
                <circle
                  cx="34" cy="34" r="28" fill="none"
                  stroke="#4ade80" strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - strokePct)}
                  transform="rotate(-90 34 34)"
                  style={{ transition: "stroke-dashoffset 0.05s linear" }}
                />
              </svg>
            </div>
          ) : (
            <div className="animate-pulse space-y-3">
              <div className="h-16 bg-[#1e2a35] rounded w-32" />
              <div className="h-4 bg-[#1e2a35] rounded w-48" />
            </div>
          )}
        </div>

        {/* Today's workout */}
        {todayWorkout && (
          <div className="border-t border-[#1e2a35] px-5 py-4">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">
              Recomendación de hoy
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-100 font-bold text-lg">{todayWorkout.title}</p>
                <p className="text-slate-400 text-sm">
                  {todayWorkout.distanceKm}km · {todayWorkout.paceTarget}
                </p>
              </div>
              <Link
                href="/entrenamiento"
                className="w-10 h-10 rounded-xl bg-lime-400 flex items-center justify-center flex-shrink-0"
              >
                <span className="text-[#080c10] font-bold text-lg leading-none">→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Why — from AI brief */}
        {brief && (
          <div className="border-t border-[#1e2a35] px-5 py-4 space-y-2">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">
              ¿Por qué?
            </p>
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-md bg-lime-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={11} className="text-lime-400" strokeWidth={2.5} />
              </div>
              <p className="text-slate-400 text-sm leading-snug">{brief.why}</p>
            </div>
            {brief.score < 70 && (
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-yellow-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle size={11} className="text-yellow-400" strokeWidth={2.5} />
                </div>
                <p className="text-yellow-400 text-sm leading-snug">Carga acumulada elevada — moderá el volumen</p>
              </div>
            )}
          </div>
        )}

        {/* AI coach quote */}
        {brief && (
          <div className="border-t border-[#1e2a35] bg-lime-400/5 px-5 py-3 flex gap-2.5">
            <MessageCircle size={14} className="text-lime-400 flex-shrink-0 mt-0.5" />
            <p className="text-lime-300 text-xs leading-relaxed italic">
              "{brief.focus}"
            </p>
          </div>
        )}
      </div>

      {/* Micro stats */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { icon: <Heart size={15} className="text-slate-500" />, label: "HRV", value: "77ms", delta: "+4ms" },
          { icon: <Moon size={15} className="text-slate-500" />, label: "Sueño", value: "8.2h", delta: "+0.4h" },
          { icon: <Activity size={15} className="text-slate-500" />, label: "TSB", value: "+5", delta: "Fresco" },
        ].map(m => (
          <div key={m.label} className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-3.5">
            {m.icon}
            <p className="text-slate-500 text-xs mt-2 mb-1">{m.label}</p>
            <p className="text-slate-100 font-bold text-base">{m.value}</p>
            <p className="text-lime-400 text-xs mt-0.5">{m.delta}</p>
          </div>
        ))}
      </div>

      {/* Week calendar */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-slate-400 text-sm font-semibold">Semana {currentWeek} de 15</p>
          <Pill label="7 días" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map(({ dow, isToday }, i) => {
            const type = DAY_TYPE[dow]
            const isPast = !isToday && (
              i < weekDays.findIndex(d => d.isToday)
            )
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <p className={`text-xs font-medium ${isToday ? "text-slate-100" : "text-slate-600"}`}>
                  {DAY_LABELS[dow]}
                </p>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                  isToday
                    ? "border-lime-400/50 bg-transparent"
                    : isPast && type === "gym"
                    ? "border-blue-400/30 bg-blue-400/10"
                    : isPast && type === "run"
                    ? "border-lime-400/30 bg-lime-400/10"
                    : "border-[#1e2a35] bg-transparent"
                }`}>
                  {isToday ? (
                    <div className="w-2 h-2 rounded-full bg-lime-400" />
                  ) : isPast ? (
                    <Check size={11} className={type === "gym" ? "text-blue-400" : type === "run" ? "text-lime-400" : "text-slate-600"} strokeWidth={2.5} />
                  ) : type === "rest" ? (
                    <span className="text-slate-700 text-xs">—</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Race countdown */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-lime-400/5 border border-lime-400/20 rounded-2xl p-4">
          <p className="text-lime-400 text-xs font-semibold mb-1">Media Maratón</p>
          <p className="text-slate-100 font-black text-3xl leading-none">{daysUntil(RACE_A)}d</p>
          <p className="text-slate-500 text-xs mt-1.5">23 ago · Meta 1:48</p>
        </div>
        <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
          <p className="text-slate-400 text-xs font-semibold mb-1">Maratón</p>
          <p className="text-slate-100 font-black text-3xl leading-none">{daysUntil(RACE_B)}d</p>
          <p className="text-slate-500 text-xs mt-1.5">20 sep · Meta 4:00</p>
        </div>
      </div>
    </div>
  )
}
