"use client"
import { useState } from "react"
import Link from "next/link"
import { ChevronRight, MessageCircle, Zap } from "lucide-react"
import Pill from "@/components/ui/Pill"
import type { PlannedWorkout } from "@/lib/training-plan"
import type { GymDay } from "@/lib/gym-plan"

interface TrainingScreenProps {
  gymDay: GymDay | null
  runWorkout: PlannedWorkout | null
  currentWeek: number
  dayName: string
  isRestDay: boolean
}

export default function TrainingScreen({
  gymDay,
  runWorkout,
  currentWeek,
  dayName,
  isRestDay,
}: TrainingScreenProps) {
  const defaultView = gymDay ? "gym" : "run"
  const [view, setView] = useState<"run" | "gym">(defaultView)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pt-1">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">{dayName}</p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-100 leading-tight">Entrenamiento</h1>
          <div className="flex bg-[#111820] rounded-xl p-0.5 gap-0.5">
            {(["run", "gym"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  view === v ? "bg-[#1e2a35] text-slate-100" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {v === "run" ? "Correr" : "Gimnasio"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "run" && (runWorkout ? <RunView workout={runWorkout} currentWeek={currentWeek} /> : <NoWorkoutView type="run" />)}
      {view === "gym" && (gymDay ? <GymView gymDay={gymDay} currentWeek={currentWeek} /> : <NoWorkoutView type="gym" />)}
      {isRestDay && <RestView />}
    </div>
  )
}

// ─── Run View ──────────────────────────────────────────────────────────────────
function RunView({ workout, currentWeek }: { workout: PlannedWorkout; currentWeek: number }) {
  const ZONES = [
    { label: "Z2 Easy",   pace: "5:55-6:15/km", hr: "HR < 140" },
    { label: "Z4 Umbral", pace: "5:05-5:20/km", hr: "HR 161-180" },
    { label: "Z5 VO2",    pace: "4:30-4:50/km", hr: "HR 181+" },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
        {/* Hero */}
        <div className="p-5">
          <Pill label={`${workout.phase} · Semana ${currentWeek}`} />
          <h2 className="text-slate-100 text-2xl font-black mt-3 mb-1">{workout.title}</h2>
          <p className="text-slate-400 text-sm mb-4">{workout.description}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              [workout.distanceKm + "km", "Distancia"],
              [workout.paceTarget ?? "—", "Ritmo"],
              [workout.hrTarget ?? "—", "FC objetivo"],
            ].map(([v, l]) => (
              <div key={l} className="bg-[#080c10] rounded-xl p-3">
                <p className="text-slate-100 font-bold text-sm">{v}</p>
                <p className="text-slate-500 text-xs mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Structure */}
        <div className="border-t border-[#1e2a35] px-5 py-4">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Detalles</p>
          <p className="text-slate-300 text-sm leading-relaxed">{workout.details}</p>
        </div>

        {/* Coach tip */}
        <div className="border-t border-[#1e2a35] bg-lime-400/5 px-5 py-3 flex gap-2.5">
          <MessageCircle size={13} className="text-lime-400 flex-shrink-0 mt-0.5" />
          <p className="text-lime-300 text-xs leading-relaxed italic">
            "Calentá bien 10min antes de los esfuerzos. Cada serie debe sentirse al 90% de esfuerzo percibido."
          </p>
        </div>
      </div>

      {/* Zones */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">Zonas de referencia</p>
        <div className="space-y-3">
          {ZONES.map(z => (
            <div key={z.label} className="flex items-center justify-between">
              <span className="text-slate-400 text-sm font-semibold w-24 flex-shrink-0">{z.label}</span>
              <span className="text-slate-100 text-sm font-bold flex-1">{z.pace}</span>
              <span className="text-slate-500 text-xs">{z.hr}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Gym View ─────────────────────────────────────────────────────────────────
function GymView({ gymDay, currentWeek }: { gymDay: GymDay; currentWeek: number }) {
  const allExercises = [...gymDay.exercises, ...gymDay.core]
  const totalSets = allExercises.reduce((acc, ex) => acc + ex.sets, 0)

  return (
    <div className="space-y-4">
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
        {/* Hero */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <Pill label={`PPL · ${gymDay.type}`} />
              <h2 className="text-slate-100 text-2xl font-black mt-3 mb-1">{gymDay.type}</h2>
              <p className="text-slate-500 text-sm">{gymDay.phase}</p>
            </div>
            <Pill label={`Semana ${currentWeek}`} className="mt-1" />
          </div>
          <div className="flex gap-4 pt-4 border-t border-[#1e2a35]">
            {[
              ["~70 min", "Duración"],
              [String(gymDay.exercises.length), "Ejercicios"],
              [String(totalSets), "Series"],
            ].map(([v, l]) => (
              <div key={l} className="flex-1 text-center">
                <p className="text-slate-100 font-extrabold text-lg leading-none">{v}</p>
                <p className="text-slate-500 text-xs mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Exercise list */}
        <div className="border-t border-[#1e2a35] divide-y divide-[#1e2a35]">
          {gymDay.exercises.map((ex, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-slate-100 text-sm font-semibold">{ex.name}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {ex.sets}×{ex.reps}{ex.weight ? ` · ${ex.weight}` : ""}
                  {ex.notes ? ` — ${ex.notes}` : ""}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-700 flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* Core finisher */}
        {gymDay.core.length > 0 && (
          <>
            <div className="border-t border-[#1e2a35] px-5 pt-4 pb-2">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                Core Finisher <span className="text-lime-400 font-normal normal-case">(8-10 min)</span>
              </p>
            </div>
            <div className="divide-y divide-[#1e2a35]">
              {gymDay.core.map((ex, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <p className="text-slate-300 text-sm">{ex.name}</p>
                  <span className="text-slate-500 text-xs font-mono ml-3 flex-shrink-0">
                    {ex.sets}×{ex.reps}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Coach tip */}
        <div className="border-t border-[#1e2a35] bg-lime-400/5 px-5 py-3 flex gap-2.5">
          <MessageCircle size={13} className="text-lime-400 flex-shrink-0 mt-0.5" />
          <p className="text-lime-300 text-xs leading-relaxed italic">
            "Activá el manguito rotador antes del press. Si el primer set se siente pesado, hacé uno de calentamiento previo."
          </p>
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/gym"
        className="flex items-center justify-center gap-2 w-full bg-lime-400 text-[#080c10] font-black text-base rounded-2xl py-4 hover:bg-lime-300 transition-colors"
      >
        <Zap size={18} strokeWidth={2.5} />
        Iniciar sesión
      </Link>
    </div>
  )
}

function NoWorkoutView({ type }: { type: "run" | "gym" }) {
  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-8 text-center">
      <p className="text-slate-500 text-sm">
        No hay {type === "run" ? "corrida" : "sesión de gym"} programada para hoy.
      </p>
    </div>
  )
}

function RestView() {
  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-8 text-center">
      <p className="text-3xl mb-3">😴</p>
      <p className="text-slate-100 font-bold text-lg">Día de descanso</p>
      <p className="text-slate-500 text-sm mt-2 leading-snug">El descanso es parte del entrenamiento.</p>
    </div>
  )
}
