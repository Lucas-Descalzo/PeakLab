import { NextRequest, NextResponse } from "next/server";
import { buildPlan } from "@/lib/training-plan";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const plan = buildPlan();
  const workout = plan.find((w) => w.date === date);
  if (!workout) return NextResponse.json(null);
  return NextResponse.json(workout);
}
