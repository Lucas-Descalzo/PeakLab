/** Hex color tokens — use where Tailwind can't reach: recharts, SVG, dynamic inline styles */
export const colors = {
  bg:      "#080c10",
  surface: "#0f1419",
  border:  "#1e2a35",
  lime:    "#4ade80",
  blue:    "#60a5fa",
  yellow:  "#fbbf24",
  red:     "#ef4444",
  t1:      "#f8fafc",
  t2:      "#94a3b8",
  t3:      "#475569",
} as const

export type ThemeColor = typeof colors[keyof typeof colors]
