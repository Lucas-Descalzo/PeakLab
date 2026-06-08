"use client";
import { useState, useRef, useEffect } from "react";

interface Message { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "¿Cómo debería correr mañana si dormí poco?",
  "¿En qué zona tengo que ir en el long run?",
  "¿Qué ejercicios de gym priorizo esta semana?",
  "¿Cómo me preparo para la media maratón?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = text || input.trim();
    if (!content) return;

    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error de conexión." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-lg">
          🤖
        </div>
        <div>
          <p className="text-slate-100 font-bold text-base leading-tight">Coach IA</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 inline-block" />
            <span className="text-lime-400 text-xs">En línea</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            {/* Welcome bubble */}
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                🤖
              </div>
              <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <p className="text-slate-300 text-sm leading-relaxed">
                  Hola. Soy tu coach de entrenamiento. Tengo acceso a tu plan, tus datos de Garmin y tu historial de gym. ¿En qué te puedo ayudar?
                </p>
              </div>
            </div>

            {/* Suggestions */}
            <div className="pl-9">
              <p className="text-slate-500 text-xs mb-2">Preguntas frecuentes</p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left border border-lime-400/25 hover:border-lime-400/50 rounded-xl p-3 text-sm text-lime-400 hover:text-lime-300 transition-colors bg-lime-400/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-sm flex-shrink-0 mb-0.5">
                🤖
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-lime-400 text-[#080c10] font-medium rounded-br-sm"
                  : "bg-[#0f1419] border border-[#1e2a35] text-slate-200 rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-sm flex-shrink-0 mb-0.5">
              🤖
            </div>
            <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl rounded-bl-sm px-4 py-2.5">
              <span className="text-slate-400 text-sm">Pensando</span>
              <span className="animate-pulse text-slate-400">...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Preguntá algo..."
          className="flex-1 bg-[#0f1419] border border-[#1e2a35] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-lime-400/40"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="px-4 py-3 bg-lime-400 hover:bg-lime-300 disabled:opacity-40 text-[#080c10] rounded-xl font-bold text-sm transition-colors"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
