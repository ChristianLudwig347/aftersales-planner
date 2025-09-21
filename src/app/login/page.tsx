"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("christian.ludwig@auto-eckhardt.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); // wichtig: verhindert klassisches POST auf /login
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(
          data?.error === "INVALID_LOGIN"
            ? "E-Mail oder Passwort falsch."
            : data?.error === "NO_PASSWORD_SET"
            ? "Für diesen Benutzer ist kein Passwort gesetzt."
            : "Vorgang fehlgeschlagen."
        );
        return;
      }

      // Erfolg: Cookie ist gesetzt → weiter auf Startseite/Kalender
      router.replace("/");
    } catch (e: any) {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded-md border p-2 bg-blue-50"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail"
          autoComplete="username"
        />
        <input
          className="w-full rounded-md border p-2 bg-blue-50"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          autoComplete="current-password"
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
        >
          {loading ? "Bitte warten…" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
