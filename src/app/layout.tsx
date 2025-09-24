// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="de">
      <body className="antialiased">
        <div className="min-h-screen grid grid-cols-[260px_1fr]">
          <aside className="border-r p-4">
            <div className="mb-6">
              <div className="text-xl font-semibold">Aftersales Planner</div>
              <div className="text-xs text-gray-500">MVP</div>

              <div className="mt-2 text-xs">
                {session ? (
                  <div className="inline-flex flex-col gap-1 rounded bg-green-50 text-green-800 px-2 py-1">
                    <span className="font-medium">Eingeloggt</span>
                    <span className="text-gray-700">
                      {session.email} ({session.role})
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded bg-gray-100 text-gray-700 px-2 py-1">
                    <span>Nicht eingeloggt</span>
                    <Link href="/login" className="underline underline-offset-2 hover:opacity-80">
                      Anmelden
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <nav className="space-y-1">
              <NavLink href="/" label="Kalender" />
              <NavLink href="/terminplaner" label="Terminplaner" />
              {/* Klassische Ansicht (falls du sie nutzt) */}
              {/* <NavLink href="/classic" label="Klassische Ansicht" /> */}
              {/* Einstellungen nur für MASTER */}
              {session?.role === "MASTER" && <NavLink href="/settings" label="Einstellungen" />}
              {session && <LogoutButton />}
            </nav>
          </aside>

          <main className="p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
