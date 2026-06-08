"use client";
import { useState } from "react";
import { PlannedWorkout, WorkoutType } from "@/lib/training-plan";

// Ordered Mon-Sun but displayed Dom-Sáb (Sun=0 ... Sat=6)
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const TYPE_COLOR: Record<WorkoutType, string> = {
  easy:     "bg-blue-500",
  quality:  "bg-yellow-400",
  long:     "bg-purple-500",
  race:     "bg-red-500",
  rest:     "bg-zinc-700",
  recovery: "bg-green-500",
};

const TYPE_RING: Record<WorkoutType, string> = {
  easy:     "ring-blue-500/60",
  quality:  "ring-yellow-400/60",
  long:     "ring-purple-500/60",
  race:     "ring-red-500/60",
  rest:     "ring-zinc-600/40",
  recovery: "ring-green-500/60",
};

export default function WeekSummary({
  workouts,
  currentWeek,
}: {
  workouts: PlannedWorkout[];
  currentWeek: number;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const totalKm = workouts.reduce((s, w) => s + w.distanceKm, 0);
  const today = new Date().toISOString().split("T")[0];

  // Build a map: dayOfWeek (0-6) → workout
  const byDay: Record<number, PlannedWorkout> = {};
  for (const w of workouts) {
    const d = new Date(w.date + "T00:00:00").getDay();
    byDay[d] = w;
  }

  // Today's day of week
  const todayDow = new Date().getDay();

  const selectedWorkout = workouts.find((w) => w.date === selectedDate) ?? null;

  function handleDayClick(dow: number) {
    const w = byDay[dow];
    if (!w || w.type === "rest") return;
    setSelectedDate((prev) => (prev === w.date ? null : w.date));
  }

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Semana {currentWeek}
        </h2>
        <span className="text-zinc-300 font-semibold text-sm">{totalKm}km</span>
      </div>

      {/* 7-day circles */}
      <div className="flex justify-between items-end gap-1">
        {DAY_LABELS.map((label, dow) => {
          const workout = byDay[dow];
          const hasTraining = workout && workout.type !== "rest";
          const isToday = dow === todayDow;
          const isPast = workout ? workout.date < today : false;
          const isSelected = workout ? workout.date === selectedDate : false;

          return (
            <div
              key={dow}
              className="flex flex-col items-center gap-1.5 day-circle"
              onClick={() => handleDayClick(dow)}
            >
              {/* Circle */}
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  hasTraining ? `${TYPE_COLOR[workout.type]} ${isSelected ? `ring-2 ${TYPE_RING[workout.type]}` : ""}` : "bg-zinc-800/50",
                  isToday ? "ring-2 ring-white/70 ring-offset-1 ring-offset-zinc-900" : "",
                  isPast && !isToday ? "opacity-35" : "",
                ].filter(Boolean).join(" ")}
              >
                {hasTraining && (
                  <span className="text-white font-bold text-xs">
                    {workout.distanceKm}
                  </span>
                )}
              </div>

              {/* Day label */}
              <span className={`text-xs ${isToday ? "text-zinc-200 font-semibold" : "text-zinc-600"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedWorkout && (
        <div className="mt-4 pt-3 border-t border-zinc-800/60">
          <div className="flex items-center justify-between">
            <p className="text-zinc-200 text-sm font-semibold">{selectedWorkout.title}</p>
            <span className="text-zinc-500 text-xs">{selectedWorkout.distanceKm}km</span>
          </div>
          {selectedWorkout.description && (
            <p className="text-zinc-500 text-xs mt-0.5 leading-snug">{selectedWorkout.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
