"use client"

interface TrainingStatusData {
  key: string
  label: string
  description: string
  color: string
  icon: string
}

interface Props {
  trainingStatus: TrainingStatusData
  size?: "sm" | "md"
}

const colorMap: Record<string, string> = {
  lime: "text-lime-400",
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  red: "text-red-400",
  blue: "text-blue-400",
}

const bgMap: Record<string, string> = {
  lime: "bg-lime-400/10 text-lime-400",
  yellow: "bg-yellow-400/10 text-yellow-400",
  orange: "bg-orange-400/10 text-orange-400",
  red: "bg-red-400/10 text-red-400",
  blue: "bg-blue-400/10 text-blue-400",
}

export default function TrainingStatusBadge({ trainingStatus, size = "md" }: Props) {
  const { label, description, color, icon } = trainingStatus

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${bgMap[color] ?? bgMap.lime}`}
      >
        {icon} {label}
      </span>
    )
  }

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">
        ESTADO DE ENTRENAMIENTO
      </p>
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">{icon}</span>
        <div>
          <p className={`text-xl font-bold ${colorMap[color] ?? colorMap.lime}`}>{label}</p>
          <p className="text-slate-400 text-sm">{description}</p>
        </div>
      </div>
    </div>
  )
}
