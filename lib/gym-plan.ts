import { getCurrentWeek } from "./training-plan"

export interface GymExercise {
  name: string
  sets: number
  reps: string       // "6-8", "10-12", "15", "20s"
  weight?: string    // "105-110kg", "25kg c/mano", "BW"
  notes?: string
}

export interface GymDay {
  type: "Push" | "Pull" | "Piernas"
  phase: string      // "Normal" | "Descarga" | "Taper" | "Recovery"
  exercises: GymExercise[]
  core: GymExercise[]
}

// Core finisher — always at the end of every session
const CORE_FINISHER: GymExercise[] = [
  { name: "Dead bugs", sets: 3, reps: "8 por lado", notes: "Control lumbar, espalda pegada al suelo" },
  { name: "Copenhagen plank", sets: 3, reps: "20s por lado", notes: "Aductores + core lateral" },
  { name: "Pallof press", sets: 3, reps: "10 por lado", notes: "Polea a altura de pecho" },
]

// Standard exercise templates
const PUSH_STANDARD: GymExercise[] = [
  { name: "Press banca", sets: 4, reps: "6-8", weight: "105-110kg" },
  { name: "Press inclinado mancuernas", sets: 3, reps: "10", weight: "30-35kg c/mano" },
  { name: "Press militar", sets: 3, reps: "8", weight: "60-70kg" },
  { name: "Elevaciones laterales", sets: 3, reps: "15" },
  { name: "Fondos con peso", sets: 3, reps: "8-10" },
  { name: "Tríceps polea", sets: 3, reps: "12" },
]

const PULL_STANDARD: GymExercise[] = [
  { name: "Dominadas con peso", sets: 4, reps: "6-8", notes: "Lastre si disponible, sino BW hasta fallo" },
  { name: "Remo con barra", sets: 4, reps: "8", weight: "90-100kg" },
  { name: "Remo en polea", sets: 3, reps: "10" },
  { name: "Face pull", sets: 3, reps: "15" },
  { name: "Curl bíceps barra", sets: 3, reps: "10" },
  { name: "Remo a una mano", sets: 3, reps: "10 c/lado" },
]

const PIERNAS_STANDARD: GymExercise[] = [
  { name: "Hip thrust", sets: 4, reps: "10", weight: "80-100kg", notes: "Nuevo — máxima prioridad" },
  { name: "Bulgarian split squat", sets: 3, reps: "8/pierna", weight: "25-27.5kg c/mano" },
  { name: "Prensa 45°", sets: 3, reps: "10", weight: "160-180kg" },
  { name: "Curl isquiotibiales acostado", sets: 3, reps: "12" },
  { name: "Abducción cadera máquina", sets: 3, reps: "15", notes: "Nuevo" },
  { name: "Elevación talones una pierna", sets: 3, reps: "15/pierna", notes: "Nuevo — importante para running" },
]

function scaleExercises(exercises: GymExercise[], phase: string): GymExercise[] {
  if (phase === "Normal") return exercises

  if (phase === "Descarga") {
    // Reduce to 2-3 sets, same weight
    return exercises.map((ex) => ({ ...ex, sets: Math.min(ex.sets, 3) }))
  }

  if (phase === "Taper") {
    // 2 sets max
    return exercises.map((ex) => ({ ...ex, sets: Math.min(ex.sets, 2) }))
  }

  if (phase === "Recovery") {
    // 2 sets
    return exercises.map((ex) => ({ ...ex, sets: 2 }))
  }

  return exercises
}

function getPiernasTaper(): GymExercise[] {
  // No hip thrust pesado, bulgarias con BW o 12.5kg, 2 series max
  return [
    { name: "Hip thrust", sets: 2, reps: "10", weight: "40-60kg", notes: "Taper — peso reducido" },
    { name: "Bulgarian split squat", sets: 2, reps: "8/pierna", weight: "BW o 12.5kg c/mano", notes: "Taper — ligero" },
    { name: "Prensa 45°", sets: 2, reps: "10", weight: "120-140kg" },
    { name: "Curl isquiotibiales acostado", sets: 2, reps: "12" },
    { name: "Abducción cadera máquina", sets: 2, reps: "15" },
    { name: "Elevación talones una pierna", sets: 2, reps: "15/pierna" },
  ]
}

export function getGymPhaseForWeek(week: number): string {
  if (week >= 1 && week <= 6) return "Normal"
  if (week === 7) return "Descarga"
  if (week >= 8 && week <= 9) return "Normal"
  if (week >= 10 && week <= 11) return "Taper"
  if (week === 12) return "Recovery"
  if (week >= 13 && week <= 14) return "Normal"
  if (week === 15) return "Taper"
  // Default for out-of-range
  return "Normal"
}

export function getGymDayByType(
  type: "Push" | "Pull" | "Piernas",
  week?: number
): GymDay {
  const currentWeek = week ?? getCurrentWeek()
  const phase = getGymPhaseForWeek(currentWeek)

  // Recovery phase: only Push and Pull (no Piernas)
  // Still return a Piernas day if explicitly requested but mark it
  if (phase === "Recovery" && type === "Piernas") {
    return {
      type: "Piernas",
      phase: "Recovery",
      exercises: [], // omitted per spec
      core: CORE_FINISHER,
    }
  }

  let exercises: GymExercise[]

  if (type === "Push") {
    exercises = scaleExercises(PUSH_STANDARD, phase)
  } else if (type === "Pull") {
    exercises = scaleExercises(PULL_STANDARD, phase)
  } else {
    // Piernas
    if (phase === "Taper") {
      exercises = getPiernasTaper()
    } else {
      exercises = scaleExercises(PIERNAS_STANDARD, phase)
    }
  }

  return { type, phase, exercises, core: CORE_FINISHER }
}

export function getTodayGymDay(): GymDay | null {
  const today = new Date()
  // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  const dow = today.getDay()

  let type: "Push" | "Pull" | "Piernas" | null = null
  if (dow === 1) type = "Push"
  else if (dow === 3) type = "Pull"
  else if (dow === 5) type = "Piernas"

  if (!type) return null

  const week = getCurrentWeek()
  const phase = getGymPhaseForWeek(week)

  // Recovery phase: no Piernas
  if (phase === "Recovery" && type === "Piernas") return null

  return getGymDayByType(type, week)
}
