"use client"
import { useState } from "react"

/**
 * Botoncito "?" que despliega una explicación en lenguaje simple.
 * Para las métricas avanzadas que no son autoexplicativas.
 */
export default function InfoHint({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Qué es ${title}`}
        className="w-4 h-4 rounded-full border border-slate-600 text-slate-500 text-[10px] font-bold leading-none
                   hover:text-lime-400 hover:border-lime-400 transition-colors flex items-center justify-center"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-50 w-64 bg-[#111820] border border-[#2a3a48] rounded-xl p-3 shadow-2xl">
            <p className="text-lime-400 text-xs font-bold mb-1">{title}</p>
            <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">{text}</p>
          </div>
        </>
      )}
    </span>
  )
}
