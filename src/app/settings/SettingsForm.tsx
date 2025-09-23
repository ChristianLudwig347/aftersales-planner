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

      <label className="block text-sm font-medium mt-4">Öffnungszeiten (JSON)</label>
      <textarea
        value={openingText}
        onChange={(e) => setOpeningText(e.target.value)}
        rows={10}
        className="w-full font-mono text-sm border rounded-md px-3 py-2"
        spellCheck={false}
      />

      <div className="flex items-center gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMsg(null);
              let opening: Opening;
              try {
                opening = JSON.parse(openingText);
              } catch {
                setMsg("JSON der Öffnungszeiten ist ungültig.");
                return;
              }
              const res = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timezone: tz, opening }),
              });
              const j = await res.json().catch(() => ({}));
              if (!res.ok || !j?.ok) {
                setMsg(`Speichern fehlgeschlagen: ${j?.error ?? res.status}`);
                return;
              }
              setMsg("Gespeichert.");
              router.refresh();
            })
          }
        >
          {pending ? "Speichere…" : "Speichern"}
        </Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
