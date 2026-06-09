"use client"
import { useEffect, useState } from "react"
import TrainingStatusBadge from "@/components/TrainingStatusBadge"

interface Brief {
  score: number; status: string; color: string
  recommendation: string; why: string; focus: string; action: string
}

function derivedTrainingStatus(score: number) {
  if (score >= 75) return { key: "productive", label: "Productivo", description: "", color: "lime", icon: "⚡" }
  if (score >= 50) return { key: "maintaining", label: "Manteniendo", description: "", color: "yellow", icon: "📊" }
  return { key: "recovery", label: "Recuperación", description: "", color: "orange", icon: "⚠️" }
}

const COLOR_MAP: Record<string, string> = {
  green: "text-lime-400", lime: "text-lime-400",
  yellow: "text-yellow-400", orange: "text-orange-400", red: "text-red-400"
}

export default function PeakScoreHero() {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/daily-brief")
      .then(r => r.json())
      .then(d => { setBrief(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-3xl p-5 animate-pulse">
      <div className="h-3 bg-[#1e2a35] rounded w-24 mb-4" />
      <div className="h-16 bg-[#1e2a35] rounded w-32 mb-4" />
      <div className="h-1.5 bg-[#1e2a35] rounded mb-5" />
      <div className="space-y-2">
        <div className="h-4 bg-[#1e2a35] rounded w-full" />
        <div className="h-4 bg-[#1e2a35] rounded w-3/4" />
      </div>
    </div>
  )

  if (!brief) return null

  const scoreColor = COLOR_MAP[brief.color] || "text-lime-400"

  return (
    <div className="relative bg-[#0f1419] border border-[#1e2a35] rounded-3xl p-5 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-transparent pointer-events-none" />

      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">PEAK SCORE</p>

      <div className="flex items-end gap-3 mb-2">
        <span className={`text-7xl font-black leading-none ${scoreColor}`}>{brief.score}</span>
        <div className="mb-2">
          <p className="text-slate-400 text-sm leading-none">/100</p>
          <p className="text-slate-100 font-bold text-xl leading-tight">{brief.status}</p>
        </div>
      </div>

      <div className="h-1.5 bg-[#1e2a35] rounded-full mb-3">
        <div className="h-1.5 rounded-full bg-lime-400 transition-all duration-1000" style={{ width: `${brief.score}%` }} />
      </div>

      <div className="mb-4">
        <TrainingStatusBadge trainingStatus={derivedTrainingStatus(brief.score)} size="sm" />
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-lime-400 mt-0.5 flex-shrink-0">●</span>
          <div>
            <p className="text-slate-100 font-medium text-sm leading-snug">{brief.recommendation}</p>
            <p className="text-slate-500 text-xs mt-1">{brief.why}</p>
          </div>
        </div>

        <span className="inline-block bg-lime-400/10 text-lime-400 text-xs px-3 py-1 rounded-full font-medium">
          {brief.focus}
        </span>

        <a href="/entrenamiento" className="flex items-center justify-between w-full bg-lime-400 text-[#080c10] font-bold rounded-xl px-4 py-3">
          <span>{brief.action}</span>
          <span>→</span>
        </a>
      </div>
    </div>
  )
}
