import { getTodayWorkout, getCurrentWeek } from "@/lib/training-plan"
import { getTodayGymDay } from "@/lib/gym-plan"
import TrainingScreen from "@/components/screens/TrainingScreen"

const DAY_LABEL: Record<number, string> = {
  0: "Domingo", 1: "Lunes", 2: "Martes",
  3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado",
}

export default function EntrenamientoPage() {
  const today = new Date()
  const dow = today.getDay()

  const isGymDay  = dow === 1 || dow === 3 || dow === 5
  const isRunDay  = dow === 2 || dow === 4 || dow === 0
  const isRestDay = dow === 6

  const gymDay     = isGymDay ? getTodayGymDay()    : null
  const runWorkout = isRunDay ? (getTodayWorkout() ?? null) : null

  return (
    <TrainingScreen
      gymDay={gymDay}
      runWorkout={runWorkout}
      currentWeek={getCurrentWeek()}
      dayName={DAY_LABEL[dow]}
      isRestDay={isRestDay || (isGymDay && !gymDay) || (isRunDay && !runWorkout)}
    />
  )
}
