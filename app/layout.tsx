import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Training — Lucas",
  description: "Plan de entrenamiento running + gym",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <Nav />
        <main className="max-w-4xl mx-auto px-4 pb-24 pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
