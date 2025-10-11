"use client";

/**
 * Minimaler Test-Screen für Tages-Einträge (AW) + Tagesbilanz.
 * - Datum & Rubrik wählen
 * - Eintrag anlegen (POST /api/day-entries)
 * - Tagesbilanz anzeigen (GET /api/day-entries?date=YYYY-MM-DD)
 * - Liste der Einträge des Tages (GET /api/day-entries?from=...&to=...)
 *
 * Achtung: POST ist serverseitig nur für MASTER erlaubt.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type DayCategory = "MECH" | "BODY" | "PREP";

type DaySummaryRow = {
  category: DayCategory;
  capacity_aw: number;
  used_aw: number;
  remaining_aw: number;
};

type DayEntry = {
  id: string;
  work_day: string;
  drop_off: string | null;
  pick_up: string | null;
  title: string | null;
  work_text: string;
  category: DayCategory;
  aw: number;
  created_at: string;
};

const CAT_LABEL: Record<DayCategory, string> = {
  MECH: "Mechatronik",
  BODY: "Karosserie & Lack",
  PREP: "Aufbereitung",
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function DayTestPage() {
  const [workDay, setWorkDay] = useState<string>(todayISO());
  const [category, setCategory] = useState<DayCategory>("MECH");
  const [dropOff, setDropOff] = useState<string>("08:00");
  const [pickUp, setPickUp] = useState<string>("16:30");
  const [title, setTitle] = useState<string>("Testauftrag");
  const [workText, setWorkText] = useState<string>("Ölservice + Sichtprüfung");
  const [aw, setAw] = useState<number>(60);

  const [summary, setSummary] = useState<DaySummaryRow[] | null>(null);
  const [entries, setEntries] = useState<DayEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const remainingForSelected = useMemo(() => {
    const row = summary?.find((s) => s.category === category);
    return row?.remaining_aw ?? null;
  }, [summary, category]);

  async function loadSummary() {
    try {
      const res = await fetch(`/api/day-entries?date=${encodeURIComponent(workDay)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Fehler beim Laden der Bilanz");
      setSummary(data.summary);
    } catch (error: unknown) {
      setErr(toErrorMessage(error) || "Bilanz-Fehler");
    }
  }

  async function loadEntries() {
    try {
      const url = `/api/day-entries?from=${encodeURIComponent(workDay)}&to=${encodeURIComponent(workDay)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Fehler beim Laden der Einträge");
      setEntries(data.entries);
    } catch (error: unknown) {
      setErr(toErrorMessage(error) || "Eintrags-Fehler");
    }
  }

  useEffect(() => {
    setErr(null);
    setMsg(null);
    loadSummary();
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workDay]);

  async function createEntry() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const body = {
        work_day: workDay,
        drop_off: dropOff || null,
        pick_up: pickUp || null,
        title: title || null,
        work_text: workText,
        category,
        aw: Number(aw),
      };

      const res = await fetch("/api/day-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data?.error === "INSUFFICIENT_CAPACITY") {
          const r = data?.details?.remaining ?? "?";
          throw new Error(`Nicht genug freie AW: verbleibend ${r}, angefragt ${aw}`);
        }
        throw new Error(data?.error || "Speichern fehlgeschlagen");
      }

      setMsg("Eintrag gespeichert.");
      setTitle("Testauftrag");
      setWorkText("Ölservice + Sichtprüfung");
      setAw(60);

      await loadSummary();
      await loadEntries();
    } catch (error: unknown) {
      setErr(toErrorMessage(error) || "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tagesplanung – Test</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={workDay} onChange={(e) => setWorkDay(e.target.value)} className="w-[180px]" />
          <Button variant="secondary" onClick={() => { loadSummary(); loadEntries(); }}>Aktualisieren</Button>
        </div>
      </div>

      {/* Formular */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Eintrag anlegen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Rubrik</div>
              <Select value={category} onValueChange={(v) => setCategory(v as DayCategory)}>
                <SelectTrigger><SelectValue placeholder="Rubrik" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MECH">Mechatronik</SelectItem>
                  <SelectItem value="BODY">Karosserie & Lack</SelectItem>
                  <SelectItem value="PREP">Aufbereitung</SelectItem>
                </SelectContent>
              </Select>
              {remainingForSelected != null && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Verfügbar heute: <b>{remainingForSelected} AW</b>
                </div>
              )}
            </div>

            <div>
              <div className="mb-1 text-xs text-muted-foreground">Abgabe (drop_off)</div>
              <Input type="time" value={dropOff} onChange={(e) => setDropOff(e.target.value)} />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Abholung (pick_up)</div>
              <Input type="time" value={pickUp} onChange={(e) => setPickUp(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-muted-foreground">Titel (optional)</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Golf VII" />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Arbeitswerte (AW)</div>
              <Input
                type="number"
                value={aw}
                min={0}
                onChange={(e) => setAw(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-muted-foreground">Werkstattaufwand / Text</div>
            <Input value={workText} onChange={(e) => setWorkText(e.target.value)} />
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button onClick={createEntry} disabled={busy}>Speichern</Button>
          </div>

          {msg && <div className="text-sm text-emerald-600">{msg}</div>}
          {err && <div className="text-sm text-red-600">Fehler: {err}</div>}
        </CardContent>
      </Card>

      {/* Bilanz */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Tagesbilanz ({workDay})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {!summary && <div className="text-sm text-muted-foreground">Lade…</div>}
          {summary && summary.length === 0 && (
            <div className="text-sm text-muted-foreground">Keine Mitarbeiter vorhanden → Kapazität 0.</div>
          )}
          {summary && summary.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {summary.map((s) => (
                <div key={s.category} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{CAT_LABEL[s.category]}</div>
                    <Badge variant="secondary">{s.category}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Kapazität: <b>{s.capacity_aw} AW</b> • Belegt: <b>{s.used_aw} AW</b> • Frei:{" "}
                    <b>{s.remaining_aw} AW</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tages-Einträge */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Einträge des Tages</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {!entries && <div className="text-sm text-muted-foreground">Lade…</div>}
          {entries && entries.length === 0 && (
            <div className="text-sm text-muted-foreground">Noch keine Einträge.</div>
          )}
          {entries && entries.length > 0 && (
            <div className="grid gap-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="font-medium">{e.title || "Ohne Titel"}</div>
                    <div className="text-xs text-muted-foreground">
                      {CAT_LABEL[e.category]} • {e.work_text} • {e.drop_off || "—"} – {e.pick_up || "—"} • {e.aw} AW
                    </div>
                  </div>
                  <Badge variant="secondary">{e.category}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
