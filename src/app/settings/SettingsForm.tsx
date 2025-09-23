// src/app/settings/SettingsForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Opening = Record<string, any>;
type Props = { initial: { timezone: string; opening: Opening } };

export default function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const [tz, setTz] = useState(initial.timezone);
  const [openingText, setOpeningText] = useState(
    JSON.stringify(initial.opening ?? {}, null, 2)
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function doSave() {
    setMsg(null);
    console.log("[SettingsForm] save clicked");

    let opening: Opening;
    try {
      opening = JSON.parse(openingText);
    } catch (e) {
      console.error("[SettingsForm] JSON parse error", e);
      setMsg("JSON der Öffnungszeiten ist ungültig.");
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Wichtig: JSON.stringify mit unserem Objekt
        body: JSON.stringify({ timezone: tz, opening }),
      });

      const j = await res.json().catch(() => ({}));
      console.log("[SettingsForm] response", res.status, j);

      if (!res.ok || !j?.ok) {
        setMsg(`Speichern fehlgeschlagen: ${j?.error ?? res.status}`);
        return;
      }

      setMsg("Gespeichert.");
      router.refresh();
    } catch (err: any) {
      console.error("[SettingsForm] fetch failed", err);
      setMsg(`Netzwerkfehler: ${String(err?.message ?? err)}`);
    }
  }

  return (
    <div className="mx-auto max-w-[800px] p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>

      <label className="block text-sm font-medium">Zeitzone</label>
      <input
        value={tz}
        onChange={(e) => setTz(e.target.value)}
        className="w-full border rounded-md px-3 py-2"
        placeholder="Europe/Berlin"
      />

      <label className="block text-sm font-medium mt-4">
        Öffnungszeiten (JSON)
      </label>
      <textarea
        value={openingText}
        onChange={(e) => setOpeningText(e.target.value)}
        rows={12}
        className="w-full font-mono text-sm border rounded-md px-3 py-2"
        spellCheck={false}
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={() => start(doSave)}
        >
          {pending ? "Speichere…" : "Speichern"}
        </Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
