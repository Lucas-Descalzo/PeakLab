"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Hoy", icon: "⚡" },
  { href: "/plan", label: "Plan", icon: "📅" },
  { href: "/gym", label: "Gym", icon: "🏋️" },
  { href: "/metricas", label: "Métricas", icon: "📊" },
  { href: "/chat", label: "Coach", icon: "💬" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-backdrop border-t border-zinc-800/60">
      <div className="max-w-4xl mx-auto flex justify-around">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center py-3 px-4 text-xs transition-colors ${
                active ? "text-blue-400" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <span className={`text-xl mb-0.5 ${active ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : ""}`}>
                {l.icon}
              </span>
              <span className={active ? "font-semibold" : ""}>{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
