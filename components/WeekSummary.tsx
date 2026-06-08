import { PlannedWorkout, WorkoutType } from "@/lib/training-plan";

const DAY_LABELS: Record<string, string> = {
  "0": "Dom", "1": "Lun", "2": "Mar", "3": "Mié",
  "4": "Jue", "5": "Vie", "6": "Sáb",
};

const TYPE_DOT: Record<WorkoutType, string> = {
  easy:     "bg-blue-500",
  quality:  "bg-orange-500",
  long:     "bg-purple-500",
  race:     "bg-red-500",
  rest:     "bg-zinc-600",
  recovery: "bg-green-500",
};

export default function WeekSummary({
  workouts,
  currentWeek,
}: {
  workouts: PlannedWorkout[];
  currentWeek: number;
}) {
  const totalKm = workouts.reduce((s, w) => s + w.distanceKm, 0);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Semana {currentWeek}
        </h2>
        <span className="text-zinc-300 font-medium text-sm">{totalKm}km planificados</span>
      </div>

      <div className="space-y-2">
        {workouts.map((w) => {
          const date = new Date(w.date + "T00:00:00");
          const dayNum = date.getDay().toString();
          const isPast = w.date < today;
          const isToday = w.date === today;

          return (
            <div
              key={w.date}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                isToday
                  ? "bg-zinc-800 border border-zinc-600"
                  : "hover:bg-zinc-800/50"
              }`}
            >
              <div className="w-8 text-center">
                <p className={`text-xs ${isToday ? "text-zinc-200 font-bold" : "text-zinc-500"}`}>
                  {DAY_LABELS[dayNum]}
                </p>
              </div>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_DOT[w.type]} ${isPast ? "opacity-40" : ""}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isPast ? "text-zinc-500" : "text-zinc-200"}`}>
                  {w.title}
                </p>
              </div>
              <span className={`text-xs flex-shrink-0 ${isPast ? "text-zinc-600" : "text-zinc-400"}`}>
                {w.distanceKm}km
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
