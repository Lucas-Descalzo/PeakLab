"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, Dumbbell, BarChart3, MessageCircle } from "lucide-react";

const links = [
  { href: "/",              label: "Inicio",  Icon: Home          },
  { href: "/entrenamiento", label: "Entrena", Icon: Zap           },
  { href: "/gym",           label: "Gym",     Icon: Dumbbell      },
  { href: "/metricas",      label: "Progreso",Icon: BarChart3     },
  { href: "/chat",          label: "Coach",   Icon: MessageCircle },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#080c10] border-t border-zinc-800/60">
      <div className="max-w-4xl mx-auto flex justify-around">
        {links.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center py-3 px-4 text-xs transition-colors ${
                active ? "text-lime-400" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <Icon
                size={20}
                className={`mb-0.5 ${active ? "drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]" : ""}`}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
