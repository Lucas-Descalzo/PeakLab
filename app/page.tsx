import { getTodayWorkout, getCurrentWeek } from "@/lib/training-plan"
import HomeScreen from "@/components/screens/HomeScreen"

export default function Dashboard() {
  const todayWorkout = getTodayWorkout() ?? null
  const currentWeek = getCurrentWeek()

  return <HomeScreen todayWorkout={todayWorkout} currentWeek={currentWeek} />
}
