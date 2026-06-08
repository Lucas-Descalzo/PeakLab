import { supabase } from "@/lib/supabase";

export default async function MetricasPage() {
  // Placeholder — will show real data once Supabase is connected
  const recentActivities = [
    { date: "2026-06-02", name: "VO2 máximo", distKm: 5.6, pace: "5:26", hr: 163, te: 3.5 },
    { date: "2026-05-31", name: "Base", distKm: 10.3, pace: "5:37", hr: 164, te: 4.0 },
    { date: "2026-05-28", name: "Tempo", distKm: 7.0, pace: "5:03", hr: 167, te: 4.1 },
    { date: "2026-05-26", name: "Base", distKm: 9.5, pace: "5:35", hr: 161, te: 4.1 },
    { date: "2026-05-24", name: "Base", distKm: 8.0, pace: "5:48", hr: 154, te: 3.5 },
    { date: "2026-05-10", name: "Media Maratón", distKm: 21.4, pace: "5:24", hr: 174, te: 5.0 },
  ];

  const weeklyData = [
    { week: "W17", km: 34.5 },
    { week: "W18", km: 25.4 },
    { week: "W19", km: 7.9 },
    { week: "W20", km: 13.4 },
    { week: "W21", km: 26.8 },
    { week: "W22", km: 5.6 },
  ];

  const maxKm = Math.max(...weeklyData.map((w) => w.km));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Métricas</h1>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="VO2max" value="54" unit="" sub="Superior (Garmin)" color="text-green-400" />
        <StatBox label="PR Media" value="1:51:42" unit="" sub="24 ago 2025" color="text-orange-400" />
        <StatBox label="FC Reposo" value="45" unit="bpm" sub="muy atlético" color="text-blue-400" />
        <StatBox label="HRV hoy" value="77" unit="ms" sub="en baseline (50%)" color="text-purple-400" />
      </div>

      {/* Predicciones Garmin */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Predicciones Garmin (jun 2026)
        </h2>
        <div className="space-y-2">
          {[
            { dist: "5K", time: "21:53", pace: "4:23/km", target: false },
            { dist: "10K", time: "46:32", pace: "4:39/km", target: false },
            { dist: "Media", time: "1:45:05", pace: "4:59/km", target: true },
            { dist: "Maratón", time: "3:53:55", pace: "5:33/km", target: true },
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
        <p className="text-zinc-600 text-xs mt-3">* Las predicciones Garmin son estimadas — tus tiempos reales históricos son más conservadores.</p>
      </div>

      {/* Weekly volume chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Volumen semanal (últimas 6 semanas)
        </h2>
        <div className="flex items-end gap-2 h-24">
          {weeklyData.map((w) => (
            <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-zinc-400 text-xs">{w.km}</span>
              <div
                className="w-full bg-orange-500/70 rounded-t-md"
                style={{ height: `${(w.km / maxKm) * 80}px` }}
              />
              <span className="text-zinc-600 text-xs">{w.week}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activities */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Últimas corridas
        </h2>
        <div className="space-y-2">
          {recentActivities.map((a) => (
            <div key={a.date} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-zinc-200 text-sm font-medium">{a.name}</p>
                <p className="text-zinc-500 text-xs">{a.date}</p>
              </div>
              <div className="text-right flex gap-4">
                <div>
                  <p className="text-zinc-300 text-sm font-medium">{a.distKm}km</p>
                  <p className="text-zinc-500 text-xs">{a.pace}/km</p>
                </div>
                <div>
                  <p className="text-zinc-300 text-sm font-medium">{a.hr} bpm</p>
                  <p className="text-zinc-500 text-xs">TE {a.te}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-yellow-500/20 rounded-2xl p-4">
        <p className="text-yellow-400 text-sm font-medium mb-1">⚡ Sync Strava pendiente</p>
        <p className="text-zinc-400 text-sm">Una vez configurado Strava, las actividades se van a actualizar automáticamente después de cada corrida.</p>
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
