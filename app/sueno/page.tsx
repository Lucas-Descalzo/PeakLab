export const dynamic = "force-dynamic";

import Link from "next/link";
import { getLatestWellness } from "@/lib/db";

// Fallback estático cuando todavía no hay datos sincronizados
const FALLBACK = {
  date: null as string | null,
  total: 8.2,
  deep: 1.3,
  rem: 1.5,
  hrv: 77 as number | null,
  score: null as number | null,
  restingHr: 52 as number | null,
};

// Mismo formato que Garmin Connect: "7h 43min"
function formatHours(h: number): string {
  const totalMin = Math.round(h * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hrs}h ${mins}min`;
}

function scoreBadge(score: number | null): { label: string; cls: string } {
  if (score === null) return { label: "Sin score", cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
  if (score >= 80) return { label: "Excelente", cls: "bg-lime-400/10 text-lime-400 border-lime-400/20" };
  if (score >= 60) return { label: "Bueno", cls: "bg-lime-400/10 text-lime-400 border-lime-400/20" };
  if (score >= 40) return { label: "Regular", cls: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" };
  return { label: "Pobre", cls: "bg-red-400/10 text-red-400 border-red-400/20" };
}

export default async function SuenoPage() {
  const wellness = await getLatestWellness();
  const hasLive = !!wellness?.sleep_total_s;

  const data = hasLive
    ? {
        date: wellness!.date,
        total: (wellness!.sleep_total_s ?? 0) / 3600,
        deep: (wellness!.sleep_deep_s ?? 0) / 3600,
        rem: (wellness!.sleep_rem_s ?? 0) / 3600,
        hrv: wellness!.hrv ?? null,
        score: wellness!.sleep_score ?? null,
        restingHr: wellness!.resting_hr ?? null,
      }
    : FALLBACK;

  const light = Math.max(data.total - data.deep - data.rem, 0);
  const deepPct = data.total > 0 ? (data.deep / data.total) * 100 : 0;
  const remPct = data.total > 0 ? (data.rem / data.total) * 100 : 0;
  const badge = scoreBadge(data.score);

  const metrics = [
    data.score !== null && {
      label: "Score de sueño", value: `${data.score}/100`,
      status: badge.label, statusColor: data.score >= 60 ? "text-lime-400" : "text-yellow-400",
    },
    data.hrv !== null && {
      label: "VFC nocturna", value: `${data.hrv} ms`,
      status: "Garmin", statusColor: "text-slate-500",
    },
    data.restingHr !== null && {
      label: "FC en reposo", value: `${data.restingHr} bpm`,
      status: "Garmin", statusColor: "text-slate-500",
    },
  ].filter(Boolean) as { label: string; value: string; status: string; statusColor: string }[];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pt-1 flex items-center justify-between">
        <Link href="/" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
          ← Sueño
        </Link>
        <span className="text-slate-400 font-medium text-sm">
          {data.date ?? "Hoy"}
        </span>
      </div>

      {/* Hero */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-6 text-center">
        <p className="text-5xl font-black text-slate-100 leading-none">
          {formatHours(data.total)}
        </p>
        <p className="text-slate-500 text-sm mt-2">Tiempo total de sueño</p>
        <span className={`inline-block mt-3 px-3 py-1 rounded-full border text-xs font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Fases */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">
          Fases de sueño
        </p>
        <div className="flex h-8 rounded-xl overflow-hidden gap-0.5">
          <div className="bg-blue-600 rounded-l-xl" style={{ width: `${deepPct}%` }} title={`Profundo: ${formatHours(data.deep)}`} />
          <div className="bg-purple-500" style={{ width: `${remPct}%` }} title={`REM: ${formatHours(data.rem)}`} />
          <div className="bg-blue-300 rounded-r-xl flex-1" title={`Ligero: ${formatHours(light)}`} />
        </div>
        <div className="flex gap-5 mt-4">
          {[
            { color: "bg-blue-600", label: "Profundo", value: formatHours(data.deep) },
            { color: "bg-purple-500", label: "REM", value: formatHours(data.rem) },
            { color: "bg-blue-300", label: "Ligero", value: formatHours(light) },
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

      {/* Métricas */}
      {metrics.length > 0 && (
        <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Métricas</p>
          </div>
          <div className="divide-y divide-[#1e2a35]">
            {metrics.map((m) => (
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
      )}

      {/* Insight / estado del sync */}
      {hasLive ? (
        <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🌙</span>
          <p className="text-slate-300 text-sm leading-relaxed">
            {data.total >= 7.5
              ? "Dormiste lo suficiente para absorber la carga de entrenamiento."
              : data.total >= 6.5
              ? "Sueño aceptable, pero apuntá a 7.5h+ en días de carga alta."
              : "Sueño corto. Considerá bajar la intensidad de hoy y priorizar descanso."}
          </p>
        </div>
      ) : (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <p className="text-yellow-400 text-xs font-semibold mb-0.5">Sync pendiente</p>
          <p className="text-yellow-500/70 text-xs">Datos estáticos. Cuando el workflow de Garmin sincronice sueño, esta página se actualiza sola.</p>
        </div>
      )}
    </div>
  );
}
