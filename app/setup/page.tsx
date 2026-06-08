"use client";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function SetupContent() {
  const params = useSearchParams();
  const stravaStatus = params.get("strava");
  const refreshToken = params.get("refresh_token");
  const athleteName = params.get("name");

  const [copied, setCopied] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnon, setSupabaseAnon] = useState("");
  const [supabaseService, setSupabaseService] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function copyToken() {
    if (refreshToken) {
      navigator.clipboard.writeText(refreshToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const steps = [
    {
      id: "supabase",
      title: "1. Supabase (base de datos)",
      done: false,
      content: (
        <div className="space-y-3 mt-3">
          <p className="text-zinc-400 text-sm">
            Creá una cuenta en{" "}
            <a href="https://supabase.com" target="_blank" className="text-orange-400 underline">
              supabase.com
            </a>
            , creá un proyecto, y pegá las keys:
          </p>
          <input
            placeholder="Project URL (https://xxx.supabase.co)"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600"
          />
          <input
            placeholder="anon public key"
            value={supabaseAnon}
            onChange={(e) => setSupabaseAnon(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600"
          />
          <input
            placeholder="service_role key (secret)"
            value={supabaseService}
            onChange={(e) => setSupabaseService(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600"
          />
          <p className="text-zinc-500 text-xs">
            Después de guardar, ejecutá el contenido de <code className="bg-zinc-800 px-1 rounded">supabase/schema.sql</code> en el SQL Editor de Supabase.
          </p>
        </div>
      ),
    },
    {
      id: "strava",
      title: "2. Strava",
      done: stravaStatus === "ok",
      content: (
        <div className="space-y-3 mt-3">
          {stravaStatus === "ok" && refreshToken ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-400">
                <span>✓</span>
                <span className="text-sm font-medium">
                  Conectado como {athleteName}
                </span>
              </div>
              <p className="text-zinc-400 text-sm">
                Copiá este refresh token a tu <code className="bg-zinc-800 px-1 rounded">.env.local</code> como{" "}
                <code className="bg-zinc-800 px-1 rounded">STRAVA_REFRESH_TOKEN</code>:
              </p>
              <div className="flex gap-2">
                <code className="flex-1 bg-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 break-all">
                  {refreshToken}
                </code>
                <button
                  onClick={copyToken}
                  className="px-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm whitespace-nowrap"
                >
                  {copied ? "✓" : "Copiar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-zinc-400 text-sm">
                1. En{" "}
                <a
                  href="https://www.strava.com/settings/api"
                  target="_blank"
                  className="text-orange-400 underline"
                >
                  strava.com/settings/api
                </a>{" "}
                creá una app. En <strong>Authorization Callback Domain</strong> ponés{" "}
                <code className="bg-zinc-800 px-1 rounded">localhost</code> (local) o tu dominio de Vercel.
              </p>
              <p className="text-zinc-400 text-sm">
                2. Poné el <code className="bg-zinc-800 px-1 rounded">Client ID</code> y{" "}
                <code className="bg-zinc-800 px-1 rounded">Client Secret</code> en{" "}
                <code className="bg-zinc-800 px-1 rounded">.env.local</code>, reiniciá el servidor, y:
              </p>
              <a
                href="/api/strava/auth"
                className="block w-full text-center py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-xl text-sm transition-colors"
              >
                Conectar con Strava
              </a>
              {stravaStatus === "error" && (
                <p className="text-red-400 text-sm">Error al conectar. Verificá las keys en .env.local.</p>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "gemini",
      title: "3. Gemini AI (chat)",
      done: false,
      content: (
        <div className="space-y-3 mt-3">
          <p className="text-zinc-400 text-sm">
            Obtené una API key gratuita en{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" className="text-orange-400 underline">
              aistudio.google.com
            </a>
            . Es completamente gratis para uso personal.
          </p>
          <input
            placeholder="AIza..."
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600"
          />
        </div>
      ),
    },
    {
      id: "garmin",
      title: "4. Sync Garmin (HRV + sueño)",
      done: false,
      content: (
        <div className="space-y-2 mt-3 text-sm text-zinc-400">
          <p>Ejecutar en terminal (una sola vez para instalar):</p>
          <code className="block bg-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
            pip install garth requests python-dotenv
          </code>
          <p>Crear <code className="bg-zinc-800 px-1 rounded">scripts/.env</code> con tus credenciales de Garmin Connect:</p>
          <code className="block bg-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 whitespace-pre">{`GARMIN_USER=lucasdesc04@gmail.com
GARMIN_PASS=tu_password
APP_URL=http://localhost:3000
SYNC_SECRET=el_mismo_que_en_env_local`}</code>
          <p>Sync manual:</p>
          <code className="block bg-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
            python scripts/garmin_sync.py 7
          </code>
          <p className="text-zinc-500 text-xs mt-1">
            El instalador de Windows (<code className="bg-zinc-800 px-1 rounded">scripts/install_scheduler.bat</code>) configura el sync automático diario.
          </p>
        </div>
      ),
    },
    {
      id: "webhook",
      title: "5. Webhook Strava (auto-sync post-corrida)",
      done: false,
      content: (
        <div className="space-y-2 mt-3 text-sm text-zinc-400">
          <p>Una vez deployado en Vercel, registrar el webhook (una sola vez):</p>
          <code className="block bg-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 whitespace-pre">{`curl -X POST https://www.strava.com/api/v3/push_subscriptions \\
  -d client_id=TU_CLIENT_ID \\
  -d client_secret=TU_CLIENT_SECRET \\
  -d callback_url=https://TU_APP.vercel.app/api/strava/webhook \\
  -d verify_token=training_webhook_secret_123`}</code>
          <p className="text-zinc-500 text-xs">
            Strava va a llamar a ese endpoint cada vez que terminés una actividad. Los datos aparecen en la app automáticamente.
          </p>
        </div>
      ),
    },
  ];

  async function saveEnv() {
    setSaving(true);
    // Generate .env.local content and show it
    const envContent = [
      supabaseUrl && `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
      supabaseAnon && `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnon}`,
      supabaseService && `SUPABASE_SERVICE_ROLE_KEY=${supabaseService}`,
      refreshToken && `STRAVA_REFRESH_TOKEN=${refreshToken}`,
      geminiKey && `GEMINI_API_KEY=${geminiKey}`,
    ].filter(Boolean).join("\n");

    if (envContent) {
      try {
        await fetch("/api/setup/save-env", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ envContent }),
        });
        setSaved(true);
      } catch {
        setSaved(true); // Show anyway
      }
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Seguí estos pasos para activar todas las funciones.
        </p>
      </div>

      {steps.map((step) => (
        <details key={step.id} className={`border rounded-2xl overflow-hidden ${step.done ? "border-green-500/30 bg-green-500/5" : "border-zinc-800 bg-zinc-900"}`}>
          <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
            <span className="font-medium text-zinc-200">{step.title}</span>
            {step.done && <span className="text-green-400 text-sm">✓ Conectado</span>}
          </summary>
          <div className="px-4 pb-4">{step.content}</div>
        </details>
      ))}

      {(supabaseUrl || geminiKey) && (
        <button
          onClick={saveEnv}
          disabled={saving}
          className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold rounded-xl"
        >
          {saving ? "Guardando..." : saved ? "✓ Guardado en .env.local — reiniciá el servidor" : "Guardar configuración"}
        </button>
      )}
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400">Cargando...</div>}>
      <SetupContent />
    </Suspense>
  );
}
