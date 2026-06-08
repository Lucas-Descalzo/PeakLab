import { NextRequest, NextResponse } from "next/server";
import { getTodayWorkout, getCurrentWeek, buildPlan } from "@/lib/training-plan";
import { getLatestWellness, getRecentActivities } from "@/lib/db";

// Model fallback chain — tries newest first
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

async function callGemini(apiKey: string, contents: object[], attempt = 0): Promise<string> {
  const model = process.env.GEMINI_MODEL || GEMINI_MODELS[attempt] || GEMINI_MODELS[0];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    // If model not found and we have fallbacks, try the next one
    if ((res.status === 404 || res.status === 400) && attempt < GEMINI_MODELS.length - 1) {
      console.log(`Model ${model} failed (${res.status}), trying fallback...`);
      return callGemini(apiKey, contents, attempt + 1);
    }
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sin respuesta.";
}

async function buildContext(): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const todayWorkout = getTodayWorkout();
  const currentWeek = getCurrentWeek();
  const weekWorkouts = buildPlan().filter((w) => w.week === currentWeek);

  // Load live data from Upstash
  const [wellness, activities] = await Promise.all([
    getLatestWellness().catch(() => null),
    getRecentActivities(5).catch(() => []),
  ]);

  const hrvInfo = wellness?.hrv
    ? `HRV: ${wellness.hrv}ms (baseline ${wellness.hrv_baseline_lower}-${wellness.hrv_baseline_upper}ms)`
    : "HRV: sin datos recientes";

  const sleepInfo = wellness?.sleep_total_s
    ? `Sueño anoche: ${(wellness.sleep_total_s / 3600).toFixed(1)}h${wellness.sleep_score ? `, score ${wellness.sleep_score}` : ""}`
    : "Sueño: sin datos recientes";

  const activityLines = activities.length > 0
    ? "Últimas corridas:\n" + activities.map((a) => {
        const km = (a.distance_m / 1000).toFixed(1);
        const min = Math.floor(a.duration_s / 60);
        const pace = a.avg_pace_s_per_km
          ? `${Math.floor(a.avg_pace_s_per_km / 60)}:${String(a.avg_pace_s_per_km % 60).padStart(2, "0")}/km`
          : "-";
        return `  ${a.date}: ${a.name} | ${km}km | ${min}min | ${pace} | HR ${a.avg_hr}`;
      }).join("\n")
    : `Últimas corridas (datos Garmin export):
  2026-06-02: VO2 máximo | 5.6km | 30min | 5:26/km | HR 163
  2026-05-31: Base | 10.3km | 58min | 5:37/km | HR 164
  2026-05-28: Tempo | 7.0km | 35min | 5:03/km | HR 167`;

  const planContext = weekWorkouts.map((w) =>
    `  ${["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][new Date(w.date + "T00:00:00").getDay()]}: ${w.title} — ${w.distanceKm}km ${w.paceTarget || ""}`
  ).join("\n");

  return `CONTEXTO DEL DÍA (${today}):
${hrvInfo} | ${sleepInfo}
VO2max: 54 | FC máx: 201 | FC reposo: 45 bpm

SEMANA ${currentWeek}/15 — ${weekWorkouts[0]?.phase || ""}:
${planContext}

HOY: ${todayWorkout ? `${todayWorkout.title} — ${todayWorkout.details}` : "Día de descanso"}

${activityLines}

NOTA CLAVE: Lucas tiende a correr salidas fáciles demasiado rápido (Z3/HR 154-164 en vez de Z2/HR <140). Recordárselo cuando sea relevante.`;
}

const SYSTEM_PROMPT = `Sos el coach de entrenamiento de PeakLab para Lucas, 21 años, corredor de Buenos Aires.

PERFIL:
- Gym PPL: Lunes (Push) / Miércoles (Pull) / Viernes (Piernas). Press banca 110kg×8, bulgarias 25kg×6/pierna.
- Running: 3x/sem (martes/jueves/domingo). Objectives: Media 23 ago 2026 (meta 1:48-1:52) | Maratón 20 sep 2026 (meta 4:00-4:10).
- Sin sentadilla bilateral.

ZONAS FC: Z2 easy HR 121-140 (~5:55-6:15/km) | Z4 umbral HR 161-180 (~5:05-5:20/km) | Z5 VO2max HR 181+ | HMP: 5:05-5:15/km | MP: 5:35-5:45/km

ESTILO: Español rioplatense. Respuestas cortas y directas. Con datos concretos. Preguntá si necesitás más info antes de dar consejo.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.includes("your_") || apiKey.length < 10) {
      return NextResponse.json({
        reply: "Para activar el chat necesitás agregar GEMINI_API_KEY en las env vars de Vercel. Obtenerla es gratis en aistudio.google.com.",
      });
    }

    const context = await buildContext();

    const contents = [
      { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${context}` }] },
      { role: "model", parts: [{ text: "Entendido. Tengo el contexto de hoy. ¿En qué te puedo ayudar?" }] },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const reply = await callGemini(apiKey, contents);
    return NextResponse.json({ reply });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Chat error:", msg);
    return NextResponse.json({
      reply: `Error técnico: ${msg.slice(0, 100)}. Verificá que GEMINI_API_KEY esté correctamente configurada en Vercel.`,
    });
  }
}
