// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aftersales Planner",
  description: "Planung & Dispo für Aftersales",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition"
    >
      <span>{label}</span>
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="antialiased">
        <div className="min-h-screen grid grid-cols-[260px_1fr]">
          <aside className="border-r p-4">
            <div className="mb-6">
              <div className="text-xl font-semibold">Aftersales Planner</div>
              <div className="text-xs text-gray-500">MVP</div>
            </div>

            <nav className="space-y-1">
              {/* Startseite = Kalenderübersicht */}
              <NavLink href="/" label="Kalender" />
              {/* Terminplaner statt „Teile“ */}
              <NavLink href="/terminplaner" label="Terminplaner" />
              {/* weitere Menüpunkte */}
              <NavLink href="/settings" label="Einstellungen" />
            </nav>
          </aside>

          <main className="p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
