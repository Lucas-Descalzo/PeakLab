import { NextRequest, NextResponse } from "next/server";
import { upsertWellness } from "@/lib/db";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (process.env.SYNC_SECRET && secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    return NextResponse.json({ error: "Storage not configured — KV_REST_API_URL missing in Vercel" }, { status: 503 });
  }
  const body = await req.json();
  if (!body.date) return NextResponse.json({ error: "date required" }, { status: 400 });
  await upsertWellness(body);
  return NextResponse.json({ status: "ok", date: body.date });
}
