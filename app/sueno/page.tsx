"use client";
import Link from "next/link";

const SLEEP_DATA = {
  total:    8.2,
  deep:     1.3,
  rem:      1.5,
  light:    5.4,
  efficiency:   92,
  timeToSleep:  15,
  awakenings:   2,
  avgHR:        52,
  hrv:          77,
};

interface Metric {
  label: string;
  value: string;
  status: string;
  statusColor: string;
}

const METRICS: Metric[] = [
  { label: "Eficiencia",          value: `${SLEEP_DATA.efficiency}%`,      status: "Óptimo", statusColor: "text-lime-400" },
  { label: "Tiempo para dormir",  value: `${SLEEP_DATA.timeToSleep} min`,  status: "Bueno",  statusColor: "text-lime-400" },
  { label: "Despertares",         value: `${SLEEP_DATA.awakenings}`,       status: "Óptimo", statusColor: "text-lime-400" },
  { label: "HR promedio",         value: `${SLEEP_DATA.avgHR} bpm`,        status: "Bueno",  statusColor: "text-lime-400" },
  { label: "HRV nocturno",        value: `${SLEEP_DATA.hrv} ms`,           status: "Óptimo", statusColor: "text-lime-400" },
];

const deepPct  = (SLEEP_DATA.deep  / SLEEP_DATA.total) * 100; // ~15.9%
const remPct   = (SLEEP_DATA.rem   / SLEEP_DATA.total) * 100; // ~18.3%
const lightPct = (SLEEP_DATA.light / SLEEP_DATA.total) * 100; // ~65.9%

function formatHours(h: number): string {
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

export default function SuenoPage() {
  return (
    <div className="space-y-5">
      {/* Header with back link and date nav */}
      <div className="pt-1 flex items-center justify-between">
        <Link href="/" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
          ← Sueño
        </Link>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <button className="hover:text-slate-300 transition-colors px-1">←</button>
          <span className="text-slate-400 font-medium">Hoy</span>
          <button className="hover:text-slate-300 transition-colors px-1">→</button>
        </div>
      </div>

      {/* Hero: total sleep + badge */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-6 text-center">
        <p className="text-5xl font-black text-slate-100 leading-none">
          {formatHours(SLEEP_DATA.total)}
        </p>
        <p className="text-slate-500 text-sm mt-2">Tiempo total de sueño</p>
        <span className="inline-block mt-3 px-3 py-1 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20 text-xs font-semibold">
          Bueno
        </span>
      </div>

      {/* Sleep phase visualization */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">
          Fases de sueño
        </p>

        {/* Bar */}
        <div className="flex h-8 rounded-xl overflow-hidden gap-0.5">
          <div
            className="bg-blue-600 rounded-l-xl"
            style={{ width: `${deepPct}%` }}
            title={`Deep: ${formatHours(SLEEP_DATA.deep)}`}
          />
          <div
            className="bg-purple-500"
            style={{ width: `${remPct}%` }}
            title={`REM: ${formatHours(SLEEP_DATA.rem)}`}
          />
          <div
            className="bg-blue-300 rounded-r-xl flex-1"
            title={`Light: ${formatHours(SLEEP_DATA.light)}`}
          />
        </div>

        {/* Legend */}
        <div className="flex gap-5 mt-4">
          {[
            { color: "bg-blue-600",  label: "Profundo", value: formatHours(SLEEP_DATA.deep)  },
            { color: "bg-purple-500",label: "REM",      value: formatHours(SLEEP_DATA.rem)   },
            { color: "bg-blue-300",  label: "Ligero",   value: formatHours(SLEEP_DATA.light) },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-sm ${s.color} flex-shrink-0`} />
              <div>
                <p className="text-slate-400 text-xs">{s.label}</p>
                <p className="text-slate-100 text-xs font-bold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
            Métricas
          </p>
        </div>
        <div className="divide-y divide-[#1e2a35]">
          {METRICS.map((m) => (
            <div key={m.label} className="flex items-center justify-between px-5 py-3.5 gap-3">
              <span className="text-slate-400 text-sm">{m.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-100 text-sm font-bold">{m.value}</span>
                <span className={`flex items-center gap-1 text-xs font-medium ${m.statusColor}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insight */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🌙</span>
        <p className="text-slate-300 text-sm leading-relaxed">
          Tu sueño fue reparador. Excelente trabajo.
        </p>
      </div>
    </div>
  );
}
