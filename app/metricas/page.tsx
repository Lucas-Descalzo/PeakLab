import { getRecentActivities, getLatestWellness } from "@/lib/db";
import TrainingLoadChart from "@/components/TrainingLoadChart";

const STATIC_ACTIVITIES = [
  { date: "2026-06-02", name: "VO2 máximo", distance_m: 5554, duration_s: 1812, avg_hr: 163, training_effect: 3.5 },
  { date: "2026-05-31", name: "Base", distance_m: 10324, duration_s: 3486, avg_hr: 164, training_effect: 4.0 },
  { date: "2026-05-28", name: "Tempo", distance_m: 6951, duration_s: 2106, avg_hr: 167, training_effect: 4.1 },
  { date: "2026-05-26", name: "Base", distance_m: 9500, duration_s: 3187, avg_hr: 161, training_effect: 4.1 },
  { date: "2026-05-24", name: "Base", distance_m: 7951, duration_s: 2767, avg_hr: 154, training_effect: 3.5 },
  { date: "2026-05-10", name: "Media Maratón Ciudad", distance_m: 21357, duration_s: 6936, avg_hr: 174, training_effect: 5.0 },
];

const WEEKLY_KM = [42, 48, 55, 51, 38, 62, 58];
const WEEK_LABELS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7"];

const PERSONAL_RECORDS = [
  { icon: "🏃", dist: "Mejor 1km",      time: "4:09",    date: "may 2026" },
  { icon: "⚡", dist: "Mejor 5K",       time: "24:17",   date: "nov 2025" },
  { icon: "🔟", dist: "Mejor 10K",      time: "49:41",   date: "nov 2025" },
  { icon: "🏅", dist: "Media maratón",  time: "1:51:42", date: "ago 2025" },
];

export default async function MetricasPage() {
  const [liveActivities, wellness] = await Promise.all([
    getRecentActivities(10),
    getLatestWellness(),
  ]);

  const activities = liveActivities.length > 0 ? liveActivities : STATIC_ACTIVITIES;
  const hasLiveData = liveActivities.length > 0;
  const hrv = wellness?.hrv ?? 77;
  const hrvPct = wellness
    ? Math.round(
        ((wellness.hrv ?? 77) - (wellness.hrv_baseline_lower ?? 55)) /
          ((wellness.hrv_baseline_upper ?? 99) - (wellness.hrv_baseline_lower ?? 55)) *
          100
      )
    : 50;

  const maxKm = Math.max(...WEEKLY_KM);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-100">Métricas</h1>
        {!hasLiveData && (
          <span className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-full">
            Garmin export
          </span>
        )}
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox
          icon="❤️"
          label="FC Reposo"
          value="45"
          unit="bpm"
          sub="nivel atlético"
          color="text-lime-400"
        />
        <StatBox
          icon="📈"
          label="VO2max"
          value="54"
          unit=""
          sub="Superior — Garmin"
          color="text-green-400"
        />
        <StatBox
          icon="🏃"
          label="PR Media"
          value="1:51:42"
          unit=""
          sub="24 ago 2025"
          color="text-lime-400"
        />
        <StatBox
          icon="🧠"
          label="HRV hoy"
          value={String(hrv)}
          unit="ms"
          sub={`${hrvPct}% del baseline`}
          color="text-purple-400"
        />
      </div>

      {/* Volume chart */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Volumen semanal (km)
        </h2>
        <div className="flex items-end gap-2 h-28">
          {WEEKLY_KM.map((km, i) => {
            const heightPct = (km / maxKm) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-slate-500 text-xs">{km}</span>
                <div
                  className="w-full rounded-t-md"
                  style={{ height: `${heightPct}%`, background: "linear-gradient(to bottom, #4ADE80, #16a34a)" }}
                />
                <span className="text-slate-600 text-xs">{WEEK_LABELS[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Race predictions */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Predicciones Garmin (jun 2026)
        </h2>
        <div className="space-y-2">
          {[
            { dist: "5K",      time: "21:53",   pace: "4:23/km", target: false },
            { dist: "10K",     time: "46:32",   pace: "4:39/km", target: false },
            { dist: "Media",   time: "1:45:05", pace: "4:59/km", target: true  },
            { dist: "Maratón", time: "3:53:55", pace: "5:33/km", target: true  },
          ].map((r) => (
            <div
              key={r.dist}
              className={`flex items-center justify-between p-3 rounded-xl ${
                r.target
                  ? "bg-lime-400/10 border border-lime-400/20"
                  : "bg-[#080c10]"
              }`}
            >
              <span className={`font-semibold text-sm ${r.target ? "text-lime-300" : "text-slate-300"}`}>
                {r.dist}
              </span>
              <div className="text-right">
                <span className={`font-extrabold text-base ${r.target ? "text-lime-400" : "text-slate-200"}`}>
                  {r.time}
                </span>
                <span className="text-slate-500 text-xs ml-2">{r.pace}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs mt-3 leading-snug">
          Tus tiempos reales son más conservadores — las predicciones asumen condiciones óptimas.
        </p>
      </div>

      {/* Activity log */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Últimas corridas{" "}
          {hasLiveData && (
            <span className="text-green-400 normal-case font-normal">● live</span>
          )}
        </h2>
        <div className="space-y-2">
          {activities.map((a, i) => {
            const km = (a.distance_m / 1000).toFixed(1);
            const paceRaw = a.distance_m > 0 ? a.duration_s / (a.distance_m / 1000) : 0;
            const pace = paceRaw > 0
              ? `${Math.floor(paceRaw / 60)}:${String(Math.round(paceRaw % 60)).padStart(2, "0")}`
              : "--";
            const te = (a as { training_effect?: number }).training_effect ?? null;
            return (
              <div
                key={i}
                className="bg-[#0f1419] border border-[#1e2a35] rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-slate-200 text-sm font-semibold">{a.name}</p>
                  <p className="text-slate-500 text-xs">{a.date}</p>
                </div>
                <div className="flex gap-5 text-right">
                  <div>
                    <p className="text-slate-200 text-sm font-bold">{km}km</p>
                    <p className="text-slate-500 text-xs">{pace}/km</p>
                  </div>
                  <div>
                    <p className="text-slate-200 text-sm font-bold">{a.avg_hr} bpm</p>
                    {te !== null && <p className="text-slate-500 text-xs">TE {te}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Training Load section */}
      <TrainingLoadChart />

      {/* Personal Records */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Récords personales
        </h2>
        <div className="space-y-2">
          {PERSONAL_RECORDS.map((pr) => (
            <div key={pr.dist} className="flex items-center justify-between py-1.5 border-b border-[#1e2a35] last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{pr.icon}</span>
                <span className="text-slate-300 text-sm">{pr.dist}</span>
              </div>
              <div className="text-right">
                <span className="text-lime-400 font-bold text-sm font-mono">{pr.time}</span>
                <span className="text-slate-600 text-xs ml-2">{pr.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync banner */}
      {!hasLiveData && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <p className="text-yellow-400 text-xs font-semibold mb-0.5">Sync pendiente</p>
          <p className="text-yellow-500/70 text-xs">
            Datos estáticos. Conectá Garmin para ver métricas en tiempo real.
          </p>
        </div>
      )}
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  unit,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  unit: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-base leading-none">{icon}</span>
        <p className="text-slate-500 text-xs">{label}</p>
      </div>
      <p className={`text-2xl font-extrabold leading-none ${color}`}>
        {value}
        {unit && <span className="text-sm font-normal ml-1 text-slate-500">{unit}</span>}
      </p>
      <p className="text-slate-500 text-xs mt-1">{sub}</p>
    </div>
  );
}
