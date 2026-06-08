"use client"
import { useEffect, useState } from "react"

interface ReadinessData {
  hrv?: number; hrv_score: number; sleep_score: number; load_score: number
}

function dot(score: number) {
  if (score >= 70) return "bg-lime-400"
  if (score >= 45) return "bg-yellow-400"
  return "bg-red-400"
}
function label(score: number, type: "hrv"|"sleep"|"load") {
  if (type === "load") {
    if (score >= 70) return "Fresco"; if (score >= 40) return "En forma"; return "Cargado"
  }
  if (score >= 70) return "Óptimo"; if (score >= 45) return "Bueno"; return "Bajo"
}

export default function MicroStats() {
  const [data, setData] = useState<ReadinessData | null>(null)

  useEffect(() => {
    fetch("/api/readiness").then(r => r.json()).then(setData).catch(() => {})
  }, [])

  const hrv = data?.hrv ?? 77
  const items = [
    { icon: "🫀", key: "HRV", value: `${hrv}ms`, score: data?.hrv_score ?? 50, type: "hrv" as const },
    { icon: "😴", key: "Sueño", value: "8.2h",   score: data?.sleep_score ?? 60, type: "sleep" as const },
    { icon: "⚡", key: "Carga", value: "TSB +5",  score: data?.load_score ?? 65, type: "load" as const },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ icon, key, value, score, type }) => (
        <div key={key} className="bg-[#0f1419] border border-[#1e2a35] rounded-xl p-2.5 text-center">
          <p className="text-base mb-1">{icon}</p>
          <p className="text-slate-400 text-xs">{key}</p>
          <p className="text-slate-100 font-bold text-sm">{value}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${dot(score)}`} />
            <p className="text-slate-500 text-xs">{label(score, type)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
