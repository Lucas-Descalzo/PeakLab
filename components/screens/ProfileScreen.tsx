"use client"
import { ChevronRight, Target, Trophy } from "lucide-react"

import Pill from "@/components/ui/Pill"

const GOALS = [
  {
    icon: <Target size={16} className="text-lime-400" />,
    label: "Media Maratón BsAs",
    target: "1:48:00",
    date: "23 Ago 2026",
    variant: "lime" as const,
  },
  {
    icon: <Trophy size={16} className="text-blue-400" />,
    label: "Maratón BsAs",
    target: "4:00:00",
    date: "20 Sep 2026",
    variant: "blue" as const,
  },
]

const INTEGRATIONS = [
  { name: "Garmin Connect", status: "Sincronizado · Hace 2h", active: true },
  { name: "GitHub",         status: "Conectado",              active: true },
  { name: "Claude Sonnet",  status: "Coach IA activo",        active: true },
]

const SETTINGS = [
  "Perfil atlético",
  "Zonas de entrenamiento",
  "Notificaciones",
  "Plan activo",
  "Privacidad",
]

export default function ProfileScreen() {
  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-slate-100 leading-tight">Perfil</h1>
      </div>

      {/* Profile card */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/25 flex items-center justify-center flex-shrink-0">
            <span className="text-lime-400 font-black text-2xl leading-none">L</span>
          </div>
          <div>
            <p className="text-slate-100 font-bold text-lg leading-tight">Lucas Descalzo</p>
            <p className="text-slate-500 text-sm mt-0.5">Buenos Aires · 21 años</p>
            <div className="flex gap-2 mt-2">
              <Pill label="VO2max 54" />
              <Pill label="Semana 1/15" variant="blue" />
            </div>
          </div>
        </div>
      </div>

      {/* Season goals */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">
          Objetivos de temporada
        </p>
        <div className="space-y-3">
          {GOALS.map(g => (
            <div key={g.label} className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                g.variant === "lime" ? "bg-lime-400/10 border border-lime-400/20" : "bg-blue-400/10 border border-blue-400/20"
              }`}>
                {g.icon}
              </div>
              <div className="flex-1">
                <p className="text-slate-200 text-sm font-semibold">{g.label}</p>
                <p className="text-slate-500 text-xs">{g.date}</p>
              </div>
              <p className={`font-bold text-sm ${g.variant === "lime" ? "text-lime-400" : "text-blue-400"}`}>
                {g.target}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">
          Integraciones
        </p>
        <div className="space-y-3">
          {INTEGRATIONS.map((int, i, arr) => (
            <div
              key={int.name}
              className={`flex items-center justify-between ${i < arr.length - 1 ? "pb-3 border-b border-[#1e2a35]" : ""}`}
            >
              <div>
                <p className="text-slate-100 text-sm">{int.name}</p>
                <p className="text-slate-500 text-xs mt-0.5">{int.status}</p>
              </div>
              {int.active && <div className="w-2 h-2 rounded-full bg-lime-400" />}
            </div>
          ))}
        </div>
      </div>

      {/* Settings list — items not yet implemented */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
        {SETTINGS.map((item, i, arr) => (
          <div
            key={item}
            className={`flex items-center justify-between px-5 py-4 ${
              i < arr.length - 1 ? "border-b border-[#1e2a35]" : ""
            }`}
          >
            <span className="text-slate-500 text-sm">{item}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
                Próximamente
              </span>
              <ChevronRight size={16} className="text-slate-700" />
            </div>
          </div>
        ))}
      </div>

      {/* Sign out — auth not configured yet */}
      <button
        disabled
        title="Sin auth configurado aún"
        className="w-full bg-[#0f1419] border border-[#1e2a35] rounded-2xl px-5 py-4 text-slate-600 text-sm font-semibold text-center cursor-not-allowed opacity-50"
      >
        Cerrar sesión
      </button>
    </div>
  )
}
