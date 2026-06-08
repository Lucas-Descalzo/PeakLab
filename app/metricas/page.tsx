import { getRecentActivities, getLatestWellness } from "@/lib/db";

const STATIC_ACTIVITIES = [
  { date: "2026-06-02", name: "VO2 máximo", distance_m: 5554, duration_s: 1812, avg_hr: 163, training_effect: 3.5 },
  { date: "2026-05-31", name: "Base", distance_m: 10324, duration_s: 3486, avg_hr: 164, training_effect: 4.0 },
  { date: "2026-05-28", name: "Tempo", distance_m: 6951, duration_s: 2106, avg_hr: 167, training_effect: 4.1 },
  { date: "2026-05-26", name: "Base", distance_m: 9500, duration_s: 3187, avg_hr: 161, training_effect: 4.1 },
  { date: "2026-05-24", name: "Base", distance_m: 7951, duration_s: 2767, avg_hr: 154, training_effect: 3.5 },
  { date: "2026-05-10", name: "Media Maratón Ciudad", distance_m: 21357, duration_s: 6936, avg_hr: 174, training_effect: 5.0 },
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
    ? Math.round(((wellness.hrv ?? 77) - (wellness.hrv_baseline_lower ?? 55)) / ((wellness.hrv_baseline_upper ?? 99) - (wellness.hrv_baseline_lower ?? 55)) * 100)
    : 50;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Métricas</h1>
        {!hasLiveData && (
          <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full">datos Garmin export</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBox label="VO2max" value="54" unit="" sub="Superior — Garmin" color="text-green-400" />
        <StatBox label="PR Media" value="1:51:42" unit="" sub="24 ago 2025" color="text-orange-400" />
        <StatBox label="FC Reposo" value="45" unit="bpm" sub="nivel atlético" color="text-blue-400" />
        <StatBox label="HRV hoy" value={String(hrv)} unit="ms" sub={`${hrvPct}% del baseline`} color="text-purple-400" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Predicciones Garmin (jun 2026)
        </h2>
        <div className="space-y-2">
          {[
            { dist: "5K",     time: "21:53", pace: "4:23/km", target: false },
            { dist: "10K",    time: "46:32", pace: "4:39/km", target: false },
            { dist: "Media",  time: "1:45:05", pace: "4:59/km", target: true },
            { dist: "Maratón",time: "3:53:55", pace: "5:33/km", target: true },
          ].map((r) => (
            <div key={r.dist} className={`flex items-center justify-between p-2.5 rounded-xl ${r.target ? "bg-orange-500/10 border border-orange-500/20" : "bg-zinc-800"}`}>
              <span className={`font-medium text-sm ${r.target ? "text-orange-300" : "text-zinc-300"}`}>{r.dist}</span>
              <div className="text-right">
                <span className={`font-bold ${r.target ? "text-orange-400" : "text-zinc-200"}`}>{r.time}</span>
                <span className="text-zinc-500 text-xs ml-2">{r.pace}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-zinc-600 text-xs mt-2">Tus tiempos reales son más conservadores — las predicciones asumen condiciones óptimas.</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Últimas corridas {hasLiveData ? <span className="text-green-400 normal-case text-xs ml-1">● live</span> : null}
        </h2>
        <div className="space-y-2">
          {activities.map((a, i) => {
            const km = (a.distance_m / 1000).toFixed(1);
            const totalSec = a.duration_s;
            const min = Math.floor(totalSec / 60);
            const paceRaw = a.distance_m > 0 ? totalSec / (a.distance_m / 1000) : 0;
            const pace = paceRaw > 0 ? `${Math.floor(paceRaw / 60)}:${String(Math.round(paceRaw % 60)).padStart(2, "0")}` : "--";
            const te = (a as any).training_effect ?? null;
            return (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-zinc-200 text-sm font-medium">{a.name}</p>
                  <p className="text-zinc-500 text-xs">{a.date}</p>
                </div>
                <div className="text-right flex gap-4">
                  <div>
                    <p className="text-zinc-300 text-sm font-medium">{km}km</p>
                    <p className="text-zinc-500 text-xs">{pace}/km</p>
                  </div>
                  <div>
                    <p className="text-zinc-300 text-sm font-medium">{a.avg_hr} bpm</p>
                    {te && <p className="text-zinc-500 text-xs">TE {te}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, unit, sub, color }: {
  label: string; value: string; unit: string; sub: string; color: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
      <p className="text-zinc-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {value}<span className="text-sm font-normal ml-1">{unit}</span>
      </p>
      <p className="text-zinc-500 text-xs mt-0.5">{sub}</p>
    </div>
  );
}
