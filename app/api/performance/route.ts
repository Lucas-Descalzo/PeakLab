import { NextResponse } from "next/server"
import { computePerformance } from "@/lib/performance-engine"

/**
 * GET /api/performance
 * Serie diaria CTL/ATL/TSB/ACWR + readiness sintético con breakdown
 * por componente. Pensado para alimentar gráficos del dashboard.
 */
export async function GET() {
  const snapshot = await computePerformance()
  return NextResponse.json(snapshot)
}
