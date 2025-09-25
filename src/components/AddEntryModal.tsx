"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Falls ihr eine strikte Typisierung für Kategorien nutzt,
// kannst du hier gerne das Union-Types aus eurem Code übernehmen.
// Für die Wiederverwendbarkeit lassen wir's hier als string.
type Props = {
  workDay: string;      // ISO-YYYY-MM-DD (z. B. "2025-09-25")
  category: string;     // z. B. "MECH" | "BODY" | "PREP"
  triggerLabel?: string;
  onCreated?: () => void; // optionaler Callback nach erfolgreichem Anlegen
};

export default function AddEntryModal({
  workDay,
  category,
  triggerLabel = "+ Auftrag",
  onCreated,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Form-State
  const [title, setTitle] = useState("");
  const [aw, setAw] = useState<number | "">("");
  const [dropOff, setDropOff] = useState<string>(""); // optional, frei formatiert oder "08:00"
  const [pickUp, setPickUp] = useState<string>("");   // optional
  const [workText, setWorkText] = useState<string>("");

  // UI-State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(() => {
    if (!title.trim()) return false;
    const awNum = Number(aw);
    if (!Number.isFinite(awNum)) return false;
    if (awNum <= 0) return false;
    if (awNum > 9999) return false; // simple guard
    return true;
  }, [title, aw]);

  async function handleSubmit() {
    setError(null);

    if (!isValid) {
      setError("Bitte Titel und AW gültig ausfüllen.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/day-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_day: workDay,
          category,
          title: title.trim(),
          aw: Number(aw),
          drop_off: dropOff?.trim() || null,
          pick_up: pickUp?.trim() || null,
          work_text: workText?.trim() || "",
        }),
      });

      if (!res.ok) {
        const msg = await safeErrorMessage(res);
        throw new Error(msg || `API-Fehler (${res.status})`);
      }

      // Formular zurücksetzen
      setTitle("");
      setAw("");
      setDropOff("");
      setPickUp("");
      setWorkText("");

      setOpen(false);

      // Seite/serverseitige Daten aktualisieren
      // (funktioniert aus Client-Komponente heraus)
      router.refresh();

      // Optionaler Callback des Parents
      onCreated?.();
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler beim Anlegen.");
    } finally {
      setSubmitting(false);
    }
  }

  // ENTER-Submit im letzten Feld erlauben
  function onKeyDownEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!submitting) handleSubmit();
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Auftrag</DialogTitle>
            <DialogDescription>
              {category} • {workDay}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="title">Titel*</Label>
              <Input
                id="title"
                placeholder="z. B. Bremsen VA + Service"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="aw">AW*</Label>
                <Input
                  id="aw"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="z. B. 8"
                  value={aw}
                  onChange={(e) => setAw(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dropoff">Drop-Off (optional)</Label>
                <Input
                  id="dropoff"
                  placeholder="z. B. 08:00"
                  value={dropOff}
                  onChange={(e) => setDropOff(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pickup">Pick-Up (optional)</Label>
                <Input
                  id="pickup"
                  placeholder="z. B. 16:00"
                  value={pickUp}
                  onChange={(e) => setPickUp(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="opacity-0 select-none">Spacer</Label>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">⌘/Ctrl + Enter</span> speichert
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="worktext">Arbeitsbeschreibung (optional)</Label>
              <Textarea
                id="worktext"
                placeholder="Hinweise, Teile, Besonderheiten …"
                value={workText}
                onChange={(e) => setWorkText(e.target.value)}
                onKeyDown={onKeyDownEnter}
                rows={4}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || submitting}
            >
              {submitting ? "Speichern …" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function safeErrorMessage(res: Response): Promise<string | null> {
  try {
    const data = await res.json();
    return (data && (data.error || data.message)) || null;
  } catch {
    return null;
  }
}
