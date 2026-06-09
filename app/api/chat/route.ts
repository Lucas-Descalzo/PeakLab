import { NextRequest } from "next/server";
import { getTodayWorkout, getCurrentWeek, buildPlan } from "@/lib/training-plan";
import { getLatestWellness, getRecentActivities } from "@/lib/db";

// Extend Vercel serverless timeout from 10s default to 30s
export const maxDuration = 30;

// Model fallback chain — tries newest first
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

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
    ? `HRV: ${wellness.hrv}ms (base ${wellness.hrv_baseline_lower}-${wellness.hrv_baseline_upper}ms)`
    : "HRV: sin datos";

  const sleepInfo = wellness?.sleep_total_s
    ? `Sueño: ${(wellness.sleep_total_s / 3600).toFixed(1)}h${wellness.sleep_score ? ` score ${wellness.sleep_score}` : ""}`
    : "Sueño: sin datos";

  const activityLines = activities.length > 0
    ? activities.slice(0, 3).map((a) => {
        const km = (a.distance_m / 1000).toFixed(1);
        const min = Math.floor(a.duration_s / 60);
        const pace = a.avg_pace_s_per_km
          ? `${Math.floor(a.avg_pace_s_per_km / 60)}:${String(a.avg_pace_s_per_km % 60).padStart(2, "0")}/km`
          : "-";
        return `  ${a.date}: ${a.name} ${km}km ${min}min ${pace} HR ${a.avg_hr}`;
      }).join("\n")
    : `  2026-06-02: VO2max 5.6km 30min 5:26/km HR163\n  2026-05-31: Base 10.3km 58min 5:37/km HR164\n  2026-05-28: Tempo 7.0km 35min 5:03/km HR167`;

  const planContext = weekWorkouts.map((w) =>
    `  ${["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][new Date(w.date + "T00:00:00").getDay()]}: ${w.title} ${w.distanceKm}km ${w.paceTarget || ""}`
  ).join("\n");

  return `HOY ${today}: ${hrvInfo} | ${sleepInfo} | VO2max 54 FC máx 201
SEMANA ${currentWeek}/15 — ${weekWorkouts[0]?.phase || ""}:
${planContext}
HOY: ${todayWorkout ? `${todayWorkout.title} — ${todayWorkout.details}` : "Descanso"}
CORRIDAS RECIENTES:
${activityLines}
OJO: Lucas suele correr Z2 a HR 154-164 en vez de <140. Recordárselo si aplica.`;
}

// ~120 tokens — concise profile + style guide
const SYSTEM_PROMPT = `Sos el coach IA de PeakLab de Lucas, 21 años, Buenos Aires.
PERFIL: Gym PPL L/Mi/V. Press banca 110kg×8, bulgarias 25kg×6. Running M/J/D. Sin sentadilla bilateral.
METAS: Media Maratón 23 ago 2026 (1:48-1:52) | Maratón 20 sep 2026 (4:00-4:10).
ZONAS FC: Z2 easy 121-140bpm (5:55-6:15/km) | Z4 umbral 161-180bpm (5:05-5:20/km) | Z5 VO2max 181+ | HMP 5:05-5:15/km | MP 5:35-5:45/km
ESTILO: Rioplatense. Respuestas cortas y concretas. Preguntá antes de aconsejar si falta info.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes("your_") || apiKey.length < 10) {
    const errMsg = "Para activar el chat agregá GEMINI_API_KEY en Vercel (gratis en aistudio.google.com).";
    return new Response(
      `data: ${JSON.stringify({ text: errMsg })}\n\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  try {
    const { messages } = await req.json();
    const context = await buildContext();

    // Trim to last 6 messages (3 turns) — reduces tokens on long conversations
    const trimmedMessages: { role: string; content: string }[] = (messages ?? []).slice(-6);

    const contents = [
      { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${context}` }] },
      { role: "model", parts: [{ text: "Listo, tengo el contexto. ¿En qué te ayudo?" }] },
      ...trimmedMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    // Try models in order until one accepts the request
    let streamRes: Response | null = null;
    let usedModel = "";
    const modelsToTry = [
      ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
      ...GEMINI_MODELS,
    ];

    for (const model of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
        }),
      });

      if (r.ok) {
        streamRes = r;
        usedModel = model;
        break;
      }

      const errText = await r.text();
      if (r.status !== 404 && r.status !== 400) {
        throw new Error(`Gemini ${r.status}: ${errText.slice(0, 200)}`);
      }
      console.log(`Model ${model} not available (${r.status}), trying next...`);
    }

    if (!streamRes) {
      throw new Error("No Gemini model available. Check GEMINI_API_KEY permissions.");
    }

    console.log(`Streaming response with model: ${usedModel}`);

    // Re-encode Gemini SSE stream → client, extracting text chunks
    const encoder = new TextEncoder();
    const geminiBody = streamRes.body!;

    const readable = new ReadableStream({
      async start(controller) {
        const reader = geminiBody.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const chunk = JSON.parse(jsonStr);
                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } catch {
                // ignore malformed chunks
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Chat error:", msg);
    const errMsg = `Error técnico: ${msg.slice(0, 100)}. Verificá que GEMINI_API_KEY esté configurada en Vercel.`;
    return new Response(
      `data: ${JSON.stringify({ text: errMsg })}\n\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }
}
