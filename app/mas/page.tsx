"use client";
import Link from "next/link";

const PERFIL_ITEMS = [
  { label: "Perfil" },
  { label: "Objetivos" },
  { label: "Preferencias" },
  { label: "Recordatorios" },
];

const SOPORTE_ITEMS = [
  { label: "Ayuda & Soporte" },
  { label: "Privacidad" },
];

const INTEGRATIONS = [
  { label: "Garmin",       color: "bg-blue-900/40 border-blue-600/40 text-blue-300"  },
  { label: "Strava",       color: "bg-orange-900/40 border-orange-600/40 text-orange-300" },
  { label: "Apple Health", color: "bg-red-900/40 border-red-600/40 text-red-300"     },
];

function MenuRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.03] transition-colors">
      <span className="text-slate-200 text-sm">{label}</span>
      <span className="text-slate-600 text-lg leading-none">›</span>
    </div>
  );
}

export default function MasPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-slate-100 leading-tight">Más</h1>
      </div>

      {/* Profile card */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-lime-400/20 border border-lime-400/30 flex items-center justify-center flex-shrink-0">
          <span className="text-lime-400 font-black text-xl leading-none">L</span>
        </div>
        <div>
          <p className="text-slate-100 font-bold text-base leading-tight">Lucas Descalzo</p>
          <p className="text-slate-500 text-sm mt-0.5 leading-snug">
            Enfocado en mejorar cada día.
          </p>
        </div>
      </div>

      {/* Perfil section */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Perfil</p>
        </div>
        <div className="divide-y divide-[#1e2a35]">
          {PERFIL_ITEMS.map((item) => (
            <MenuRow key={item.label} label={item.label} />
          ))}
        </div>
      </div>

      {/* Integraciones */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">
          Integraciones
        </p>
        <div className="flex gap-3 flex-wrap">
          {INTEGRATIONS.map((i) => (
            <div
              key={i.label}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${i.color}`}
            >
              {i.label}
            </div>
          ))}
        </div>
      </div>

      {/* Coach link */}
      <Link
        href="/chat"
        className="flex items-center justify-between bg-[#0f1419] border border-[#1e2a35] rounded-2xl px-5 py-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">💬</span>
          <span className="text-slate-200 text-sm font-medium">Coach IA</span>
        </div>
        <span className="text-slate-600 text-lg leading-none">›</span>
      </Link>

      {/* Soporte section */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Soporte</p>
        </div>
        <div className="divide-y divide-[#1e2a35]">
          {SOPORTE_ITEMS.map((item) => (
            <MenuRow key={item.label} label={item.label} />
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button className="w-full bg-[#0f1419] border border-[#1e2a35] rounded-2xl px-5 py-4 text-red-400 text-sm font-semibold text-center hover:bg-red-900/10 transition-colors">
        Cerrar sesión
      </button>
    </div>
  );
}
