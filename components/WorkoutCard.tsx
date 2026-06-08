import { PlannedWorkout, WorkoutType } from "@/lib/training-plan";

const TYPE_STYLES: Record<WorkoutType, { bg: string; border: string; badge: string; label: string }> = {
  easy:     { bg: "bg-blue-500/10",   border: "border-blue-500/30",   badge: "bg-blue-500/20 text-blue-300",   label: "Fácil" },
  quality:  { bg: "bg-orange-500/10", border: "border-orange-500/30", badge: "bg-orange-500/20 text-orange-300", label: "Calidad" },
  long:     { bg: "bg-purple-500/10", border: "border-purple-500/30", badge: "bg-purple-500/20 text-purple-300", label: "Long Run" },
  race:     { bg: "bg-red-500/10",    border: "border-red-500/30",    badge: "bg-red-500/20 text-red-300",     label: "Carrera" },
  rest:     { bg: "bg-zinc-800/50",   border: "border-zinc-700",      badge: "bg-zinc-700 text-zinc-400",      label: "Descanso" },
  recovery: { bg: "bg-green-500/10",  border: "border-green-500/30",  badge: "bg-green-500/20 text-green-300", label: "Recupero" },
};

export default function WorkoutCard({
  workout,
  expanded = false,
}: {
  workout: PlannedWorkout;
  expanded?: boolean;
}) {
  const s = TYPE_STYLES[workout.type];

  return (
    <div className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}>
            {s.label}
          </span>
          <h3 className="text-zinc-100 font-semibold mt-1.5">{workout.title}</h3>
        </div>
        <div className="text-right">
          <p className="text-zinc-300 font-bold">{workout.distanceKm}km</p>
          <p className="text-zinc-500 text-xs">{workout.phase}</p>
        </div>
      </div>

      {workout.description && (
        <p className="text-zinc-400 text-sm mb-3">{workout.description}</p>
      )}

      {expanded && (
        <div className="space-y-2 mt-3 pt-3 border-t border-white/10">
          <p className="text-zinc-200 text-sm leading-relaxed">{workout.details}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {workout.paceTarget && (
              <Chip icon="⏱" label={workout.paceTarget} />
            )}
            {workout.hrTarget && (
              <Chip icon="❤️" label={workout.hrTarget} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full">
      {icon} {label}
    </span>
  );
}
