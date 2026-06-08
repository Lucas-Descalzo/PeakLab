import { getTodayWorkout, getCurrentWeek, buildPlan } from "@/lib/training-plan"
import PeakScoreHero from "@/components/PeakScoreHero"
import MicroStats from "@/components/MicroStats"
import WeekSummary from "@/components/WeekSummary"

function workoutIcon(type: string) {
  const icons: Record<string, string> = { easy: "🟢", quality: "⚡", long: "🗺️", race: "🏅", recovery: "💤" }
  return icons[type] || "🏃"
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 13) return "Buenos días"
  if (h < 20) return "Buenas tardes"
  return "Buenas noches"
}

export default function Dashboard() {
  const today = getTodayWorkout()
  const currentWeek = getCurrentWeek()
  const weekWorkouts = buildPlan().filter(w => w.week === currentWeek)

  return (
    <div className="space-y-4 pb-4">
      <p className="text-slate-400 text-sm pt-2">{getGreeting()}, Lucas</p>

      <PeakScoreHero />

      <MicroStats />

      {today && (
        <div className="flex items-center gap-3 bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-3">
          <div className="w-9 h-9 rounded-lg bg-lime-400/10 flex items-center justify-center text-lg flex-shrink-0">
            {workoutIcon(today.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-100 font-semibold text-sm truncate">{today.title}</p>
            <p className="text-slate-500 text-xs">{today.distanceKm}km · {today.paceTarget}</p>
          </div>
          <a href="/entrenamiento" className="text-lime-400 text-sm font-semibold flex-shrink-0">Ver →</a>
        </div>
      )}

      <WeekSummary workouts={weekWorkouts} currentWeek={currentWeek} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "📅", label: "Semana", value: `${currentWeek}/15`, sub: "del ciclo", highlight: false },
          { icon: "🏃", label: "Media", value: "23 ago", sub: "meta 1:48-1:52", highlight: true },
          { icon: "🏅", label: "Maratón", value: "20 sep", sub: "meta 4:00-4:10", highlight: false },
        ].map(({ icon, label, value, sub, highlight }) => (
          <div key={label} className={`rounded-xl p-3 border text-center ${highlight ? "bg-lime-400/5 border-lime-400/20" : "bg-[#0f1419] border-[#1e2a35]"}`}>
            <p className="text-xl mb-1">{icon}</p>
            <p className={`font-bold text-lg ${highlight ? "text-lime-400" : "text-slate-100"}`}>{value}</p>
            <p className="text-slate-400 text-xs">{label}</p>
            <p className="text-slate-600 text-xs">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
