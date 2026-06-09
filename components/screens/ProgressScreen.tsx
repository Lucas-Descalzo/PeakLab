"use client"
import { useState } from "react"
import { Heart, Flame, Activity, TrendingUp } from "lucide-react"
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import Pill from "@/components/ui/Pill"
import { colors } from "@/lib/theme"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.value}</p>
      ))}
    </div>
  )
}

const READINESS_DATA = [
  { d: "L-5", v: 71 }, { d: "L-4", v: 68 }, { d: "L-3", v: 82 },
  { d: "L-2", v: 59 }, { d: "L-1", v: 74 }, { d: "Hoy", v: 82 },
]
const LOAD_DATA = [
  { d: "S-5", atl: 18, ctl: 22 }, { d: "S-4", atl: 28, ctl: 24 },
  { d: "S-3", atl: 15, ctl: 22 }, { d: "S-2", atl: 32, ctl: 25 },
  { d: "S-1", atl: 22, ctl: 24 }, { d: "Hoy", atl: 18, ctl: 23 },
]
const VO2_DATA = [
  { m: "Nov", v: 51.2 }, { m: "Dic", v: 52.1 }, { m: "Ene", v: 52.8 },
  { m: "Feb", v: 53.1 }, { m: "Mar", v: 53.6 }, { m: "Abr", v: 54.0 }, { m: "May", v: 54.2 },
]
const STRENGTH_DATA = [
  { w: "S1", v: 3200 }, { w: "S2", v: 3450 }, { w: "S3", v: 3100 },
  { w: "S4", v: 3800 }, { w: "S5", v: 3600 }, { w: "S6", v: 4100 },
]
const RACE_PREDS = [
  { dist: "5K",     pred: "21:53", pace: "4:23/km" },
  { dist: "10K",    pred: "46:32", pace: "4:39/km" },
  { dist: "Media",  pred: "1:45:05", pace: "4:59/km", target: true },
  { dist: "Maratón", pred: "3:53:55", pace: "5:33/km", target: true },
]
const STRENGTH_LIFTS = [
  { name: "Press banca",  est: "132kg", delta: "+4kg", pct: 82 },
  { name: "Press militar", est: "76kg",  delta: "+3kg", pct: 64 },
  { name: "Fondos c/peso", est: "BW+28", delta: "+5kg", pct: 71 },
]

export default function ProgressScreen() {
  const [tab, setTab] = useState<"recovery" | "run" | "strength">("recovery")

  return (
    <div className="space-y-5">
      {/* Header + tabs */}
      <div>
        <h1 className="text-2xl font-black text-slate-100 mb-4">Progreso</h1>
        <div className="flex bg-[#111820] rounded-xl p-0.5 gap-0.5">
          {([
            ["recovery", "Readiness"],
            ["run", "Correr"],
            ["strength", "Fuerza"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === id ? "bg-[#1e2a35] text-slate-100" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "recovery" && <RecoveryTab />}
      {tab === "run" && <RunTab />}
      {tab === "strength" && <StrengthTab />}
    </div>
  )
}

// ─── Recovery tab ──────────────────────────────────────────────────────────────
function RecoveryTab() {
  return (
    <div className="space-y-4">
      {/* Readiness chart */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Readiness · 7 días</p>
            <p className="text-slate-100 text-xl font-black">82 <span className="text-slate-500 text-sm font-normal">hoy</span></p>
          </div>
          <Pill label="↑ Tendencia" />
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={READINESS_DATA} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.lime} stopOpacity={0.2} />
                <stop offset="95%" stopColor={colors.lime} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="d" tick={{ fill: colors.t3, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: colors.t3, fontSize: 10 }} axisLine={false} tickLine={false} domain={[40, 100]} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="v" stroke={colors.lime} strokeWidth={2} fill="url(#rg)"
              dot={{ fill: colors.lime, r: 3, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Heart size={16} className="text-slate-500" />, label: "HRV promedio", value: "74ms", delta: "+6ms" },
          { icon: <Flame size={16} className="text-slate-500" />, label: "Sueño promedio", value: "7.8h", delta: "+0.3h" },
          { icon: <Activity size={16} className="text-slate-500" />, label: "CTL (Fitness)", value: "23", delta: "+4" },
          { icon: <TrendingUp size={16} className="text-slate-500" />, label: "TSB (Forma)", value: "+5", delta: "Fresco" },
        ].map(m => (
          <div key={m.label} className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
            {m.icon}
            <p className="text-slate-500 text-xs mt-2 mb-1">{m.label}</p>
            <p className="text-slate-100 font-black text-xl">{m.value}</p>
            <p className="text-lime-400 text-xs mt-0.5">{m.delta}</p>
          </div>
        ))}
      </div>

      {/* ATL vs CTL */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Carga ATL vs CTL</p>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={LOAD_DATA} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
            <XAxis dataKey="d" tick={{ fill: colors.t3, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: colors.t3, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="atl" stroke={colors.lime} strokeWidth={2} dot={false} name="ATL" />
            <Line type="monotone" dataKey="ctl" stroke={colors.blue} strokeWidth={2} dot={false} name="CTL" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Run tab ───────────────────────────────────────────────────────────────────
function RunTab() {
  return (
    <div className="space-y-4">
      {/* VO2max trend */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">VO2max</p>
            <p className="text-slate-100 text-xl font-black">
              54.2 <span className="text-lime-400 text-sm font-semibold">↑ +3.0</span>
            </p>
          </div>
          <Pill label="En mejora" />
        </div>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={VO2_DATA} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.lime} stopOpacity={0.15} />
                <stop offset="95%" stopColor={colors.lime} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" tick={{ fill: colors.t3, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: colors.t3, fontSize: 10 }} axisLine={false} tickLine={false} domain={[50, 56]} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="v" stroke={colors.lime} strokeWidth={2} fill="url(#vg)"
              dot={{ fill: colors.lime, r: 3, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Race predictions */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Predicciones</p>
        <div className="space-y-2">
          {RACE_PREDS.map(r => (
            <div
              key={r.dist}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
                r.target ? "bg-lime-400/10 border border-lime-400/20" : "bg-[#080c10]"
              }`}
            >
              <span className={`font-semibold text-sm ${r.target ? "text-lime-300" : "text-slate-400"}`}>
                {r.dist}
              </span>
              <div className="text-right">
                <span className={`font-extrabold ${r.target ? "text-lime-400" : "text-slate-200"}`}>{r.pred}</span>
                <span className="text-slate-500 text-xs ml-2">{r.pace}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs mt-3 leading-snug">
          Predicciones Garmin — asumen condiciones óptimas.
        </p>
      </div>
    </div>
  )
}

// ─── Strength tab ──────────────────────────────────────────────────────────────
function StrengthTab() {
  const maxVol = Math.max(...STRENGTH_DATA.map(d => d.v))
  return (
    <div className="space-y-4">
      {/* Volume trend */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Volumen semanal</p>
            <p className="text-slate-100 text-xl font-black">
              4.1T <span className="text-blue-400 text-sm font-semibold">↑ +28%</span>
            </p>
          </div>
          <Pill label="En progresión" variant="blue" />
        </div>
        <div className="flex items-end gap-2 h-24">
          {STRENGTH_DATA.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${(d.v / maxVol) * 100}%`,
                  background: `linear-gradient(to bottom, ${colors.blue}, #1d4ed8)`,
                }}
              />
              <span className="text-slate-600 text-xs">{d.w}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 1RM estimates */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">1RM estimados</p>
        <div className="space-y-4">
          {STRENGTH_LIFTS.map(ex => (
            <div key={ex.name}>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-slate-300 text-sm">{ex.name}</p>
                <div className="flex items-center gap-2">
                  <Pill label={`↑ ${ex.delta}`} variant="blue" />
                  <p className="text-slate-100 font-bold text-sm">{ex.est}</p>
                </div>
              </div>
              <div className="h-1 bg-[#1e2a35] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${ex.pct}%`, background: colors.blue }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
