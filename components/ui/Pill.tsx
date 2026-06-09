interface PillProps {
  label: string
  variant?: "lime" | "blue" | "yellow" | "red"
  className?: string
}

const variants: Record<NonNullable<PillProps["variant"]>, string> = {
  lime:   "bg-lime-400/10 text-lime-400 border-lime-400/25",
  blue:   "bg-blue-400/10 text-blue-400 border-blue-400/25",
  yellow: "bg-yellow-400/10 text-yellow-400 border-yellow-400/25",
  red:    "bg-red-400/10 text-red-400 border-red-400/25",
}

export default function Pill({ label, variant = "lime", className = "" }: PillProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold tracking-wide flex-shrink-0 ${variants[variant]} ${className}`}>
      {label}
    </span>
  )
}
