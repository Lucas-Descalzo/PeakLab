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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800">
      <div className="max-w-4xl mx-auto flex justify-around">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center py-3 px-4 text-xs transition-colors ${
                active ? "text-orange-400" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="text-xl mb-0.5">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
