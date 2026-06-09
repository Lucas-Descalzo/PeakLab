"use client"
import { useState, useEffect, useRef } from "react"
import { Check, Plus, Pause, Play, Trophy, X } from "lucide-react"
import type { GymDay } from "@/lib/gym-plan"

const STORAGE_KEY = "peaklab_workout_session"
const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface SessionSet {
  kg: number
  reps: number
  rir: number
  done: boolean
}

interface SessionExercise {
  name: string
  sets: SessionSet[]
}

interface CompletedSession {
  type: "Push" | "Pull" | "Piernas"
  exercises: SessionExercise[]
  duration_min: number
}

interface WorkoutSessionProps {
  gymDay: GymDay
  onFinish: (session: CompletedSession) => Promise<void>
  onClose: () => void
}

interface PersistedSession {
  type: string
  exercises: SessionExercise[]
  exIdx: number
  activeSet: number
  elapsed: number
  savedAt: number
}

function loadSavedSession(type: string): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: PersistedSession = JSON.parse(raw)
    if (parsed.type !== type) return null
    if (Date.now() - parsed.savedAt > SESSION_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function clearSavedSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

function est1RM(kg: number, reps: number) {
  return reps > 0 ? Math.round(kg * (1 + reps / 30)) : 0
}

export default function WorkoutSession({ gymDay, onFinish, onClose }: WorkoutSessionProps) {
  const allExercises = [...gymDay.exercises, ...gymDay.core]

  // Init sets from plan, restoring from localStorage if a matching session exists
  const [exercises, setExercises] = useState<SessionExercise[]>(() => {
    const saved = loadSavedSession(gymDay.type)
    if (saved) return saved.exercises
    return allExercises.map(ex => ({
      name: ex.name,
      sets: Array.from({ length: ex.sets }, () => ({ kg: 0, reps: 0, rir: 2, done: false })),
    }))
  })

  const [exIdx, setExIdx] = useState<number>(() => {
    const saved = loadSavedSession(gymDay.type)
    return saved ? saved.exIdx : 0
  })
  const [activeSet, setActiveSet] = useState<number>(() => {
    const saved = loadSavedSession(gymDay.type)
    return saved ? saved.activeSet : 0
  })
  const [elapsed, setElapsed] = useState<number>(() => {
    const saved = loadSavedSession(gymDay.type)
    return saved ? saved.elapsed : 0
  })
  const [running, setRunning] = useState(true)
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persist session state to localStorage on every relevant state change
  useEffect(() => {
    try {
      const session: PersistedSession = {
        type: gymDay.type,
        exercises,
        exIdx,
        activeSet,
        elapsed,
        savedAt: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      // ignore storage errors (e.g. private mode quota)
    }
  }, [exercises, exIdx, activeSet, elapsed, gymDay.type])

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running])

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  const totalVolume = exercises.flatMap(ex => ex.sets)
    .filter(s => s.done)
    .reduce((acc, s) => acc + s.kg * s.reps, 0)

  const current = exercises[exIdx]
  const sets = current?.sets ?? []

  function updateSet(ei: number, si: number, field: keyof SessionSet, delta: number) {
    setExercises(prev => prev.map((ex, i) => i !== ei ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== si ? s : {
        ...s,
        [field]: Math.max(0, parseFloat(((s[field] as number) + delta).toFixed(1))),
      }),
    }))
  }

  function toggleDone(ei: number, si: number) {
    setExercises(prev => prev.map((ex, i) => i !== ei ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== si ? s : { ...s, done: !s.done }),
    }))
    // Auto-advance to next set
    const nextUndone = exercises[ei].sets.findIndex((s, j) => j > si && !s.done)
    if (nextUndone !== -1) setTimeout(() => setActiveSet(nextUndone), 150)
  }

  function addSet(ei: number) {
    setExercises(prev => prev.map((ex, i) => i !== ei ? ex : {
      ...ex,
      sets: [...ex.sets, { kg: ex.sets.at(-1)?.kg ?? 0, reps: ex.sets.at(-1)?.reps ?? 8, rir: 2, done: false }],
    }))
  }

  const hasPotentialPR = sets.some(s => s.done && s.kg > 0 && est1RM(s.kg, s.reps) > 130)

  async function handleFinish() {
    setSaving(true)
    clearSavedSession()
    await onFinish({
      type: gymDay.type,
      exercises,
      duration_min: Math.round(elapsed / 60),
    })
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Session header */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Sesión activa</p>
          <p className="text-slate-100 text-sm font-bold">{gymDay.type}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-lime-400 text-base font-bold tabular-nums">{fmt(elapsed)}</p>
            <p className="text-slate-600 text-xs">Tiempo</p>
          </div>
          <div className="text-center">
            <p className="text-slate-100 text-base font-bold">
              {totalVolume > 0 ? `${totalVolume.toLocaleString()}kg` : "—"}
            </p>
            <p className="text-slate-600 text-xs">Volumen</p>
          </div>
          <button
            onClick={() => setRunning(r => !r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              running
                ? "border-red-400/30 bg-red-400/10 text-red-400"
                : "border-lime-400/30 bg-lime-400/10 text-lime-400"
            }`}
          >
            {running ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            onClick={() => { clearSavedSession(); onClose() }}
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Exercise tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {exercises.map((ex, i) => {
          const doneSets = ex.sets.filter(s => s.done).length
          const isActive = i === exIdx
          return (
            <button
              key={i}
              onClick={() => {
                setExIdx(i)
                setActiveSet(ex.sets.findIndex(s => !s.done) >= 0 ? ex.sets.findIndex(s => !s.done) : 0)
              }}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs transition-colors ${
                isActive
                  ? "border-lime-400/30 bg-lime-400/10 text-lime-400"
                  : "border-[#1e2a35] text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className="font-semibold whitespace-nowrap">{ex.name.split(" ")[0]}</span>
              <span className={`text-[10px] ${doneSets === ex.sets.length ? "text-lime-400" : "text-slate-600"}`}>
                {doneSets}/{ex.sets.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Exercise header */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-slate-100 text-lg font-bold">{current?.name}</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {allExercises[exIdx]?.sets} series × {allExercises[exIdx]?.reps}
            </p>
          </div>
          {sets[activeSet] && sets[activeSet].kg > 0 && (
            <div className="bg-lime-400/10 border border-lime-400/20 rounded-xl px-3 py-1.5 text-center">
              <p className="text-lime-400 text-base font-bold leading-none">
                {est1RM(sets[activeSet].kg, sets[activeSet].reps)}
              </p>
              <p className="text-slate-500 text-[10px] mt-0.5">1RM est.</p>
            </div>
          )}
        </div>

        {hasPotentialPR && (
          <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-2 mb-3">
            <Trophy size={14} className="text-yellow-400" />
            <p className="text-yellow-400 text-xs font-semibold">Potencial nuevo PR detectado</p>
          </div>
        )}
      </div>

      {/* Sets table */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[32px_1fr_1fr_1fr_40px] px-4 py-2 bg-[#111820] border-b border-[#1e2a35]">
          {["#", "Peso", "Reps", "RIR", ""].map((h, i) => (
            <p key={i} className={`text-slate-600 text-xs font-semibold uppercase tracking-wide ${i > 0 ? "text-center" : ""}`}>
              {h}
            </p>
          ))}
        </div>

        {sets.map((s, i) => {
          const isActive = i === activeSet
          return (
            <div key={i}>
              <div
                onClick={() => setActiveSet(i)}
                className={`grid grid-cols-[32px_1fr_1fr_1fr_40px] px-4 cursor-pointer transition-colors ${
                  isActive
                    ? "bg-lime-400/5 pt-3 pb-1"
                    : s.done
                    ? "border-b border-[#1e2a35] py-3 bg-lime-400/[0.02]"
                    : "border-b border-[#1e2a35] py-3"
                } items-center`}
              >
                <p className="text-slate-500 text-sm font-semibold">{i + 1}</p>

                {isActive ? (
                  // Editable row
                  (["kg", "reps", "rir"] as const).map(f => (
                    <div key={f} className="flex items-center justify-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); updateSet(exIdx, i, f, f === "kg" ? -2.5 : -1) }}
                        className="w-6 h-6 rounded-lg bg-[#1e2a35] text-slate-300 text-sm flex items-center justify-center hover:bg-[#2a3a4a] transition-colors"
                      >−</button>
                      <span className="text-slate-100 font-bold text-sm w-8 text-center tabular-nums">{s[f]}</span>
                      <button
                        onClick={e => { e.stopPropagation(); updateSet(exIdx, i, f, f === "kg" ? 2.5 : 1) }}
                        className="w-6 h-6 rounded-lg border border-lime-400/30 text-lime-400 text-sm flex items-center justify-center hover:bg-lime-400/10 transition-colors"
                      >+</button>
                    </div>
                  ))
                ) : (
                  <>
                    <p className={`text-center text-sm ${s.done ? "text-slate-400 font-semibold" : "text-slate-500"}`}>
                      {s.kg > 0 ? `${s.kg}kg` : "—"}
                    </p>
                    <p className={`text-center text-sm ${s.done ? "text-slate-400 font-semibold" : "text-slate-500"}`}>
                      {s.reps}
                    </p>
                    <p className={`text-center text-sm ${s.done ? "text-slate-400 font-semibold" : "text-slate-500"}`}>
                      {s.rir}
                    </p>
                  </>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={e => { e.stopPropagation(); toggleDone(exIdx, i) }}
                    className={`w-7 h-7 rounded-lg border transition-colors flex items-center justify-center ${
                      s.done ? "bg-lime-400 border-lime-400" : "border-slate-600 hover:border-lime-400/50"
                    }`}
                  >
                    {s.done && <Check size={13} className="text-[#080c10]" strokeWidth={2.5} />}
                  </button>
                </div>
              </div>

              {/* Complete button below active row */}
              {isActive && (
                <div className="px-4 pb-3">
                  <button
                    onClick={() => toggleDone(exIdx, i)}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors ${
                      s.done
                        ? "bg-[#1e2a35] text-slate-400 border border-[#1e2a35]"
                        : "bg-lime-400 text-[#080c10]"
                    }`}
                  >
                    {s.done
                      ? "Desmarcar"
                      : `Completar${s.kg > 0 ? ` · 1RM est. ${est1RM(s.kg, s.reps)}kg` : ""}`}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Add set */}
        <button
          onClick={() => addSet(exIdx)}
          className="w-full flex items-center justify-center gap-2 py-3 text-slate-500 hover:text-slate-300 text-sm border-t border-dashed border-[#1e2a35] transition-colors"
        >
          <Plus size={13} />
          Agregar serie
        </button>
      </div>

      {/* Finish */}
      <button
        onClick={handleFinish}
        disabled={saving}
        className="w-full py-4 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-[#080c10] font-black text-base rounded-2xl transition-colors"
      >
        {saving ? "Guardando..." : `Finalizar sesión · ${fmt(elapsed)}`}
      </button>
    </div>
  )
}
