import { NextResponse } from "next/server"
import { computeLoadAnalysis } from "@/lib/load-analysis"
import { argentinaToday } from "@/lib/dates"

export async function GET() {
  const today = argentinaToday()
  const cacheKey = `load-analysis:${today}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let redis: any = null
  try {
    const { Redis } = await import("@upstash/redis")
    // FIX: antes usaba solo UPSTASH_REDIS_REST_URL, que no existe en Vercel
    // (la integración nativa expone KV_REST_API_URL) → el cache nunca corría.
    const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
    if (url?.startsWith("http")) {
      redis = new Redis({ url, token: token! })
      const cached = await redis.get(cacheKey)
      if (cached) {
        const data = typeof cached === "string" ? JSON.parse(cached) : cached
        return NextResponse.json({ ...data, cached: true })
      }
    }
  } catch {}

  const result = await computeLoadAnalysis()

  try {
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(result), { ex: 6 * 60 * 60 })
    }
  } catch {}

  return NextResponse.json({ ...result, cached: false })
}
