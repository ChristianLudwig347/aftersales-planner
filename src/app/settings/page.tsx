"use client";

/**
 * Aftersales Planner – Einstellungen mit Mitarbeiterverwaltung
 * - Listet Mitarbeiter aus /api/employees
 * - Anlegen über Dialog
 * - Löschen
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Wrench } from "lucide-react";

/* ---------------------------------------------
   Typen & Hilfswerte
---------------------------------------------- */
type EmployeeCategory = "MECH" | "BODY" | "PREP";

type Employee = {
  id: string;
  name: string;
  category: EmployeeCategory;
  performance: number; // 0..300 (%)
};

const CATEGORY_LABEL: Record<EmployeeCategory, string> = {
  MECH: "Mechatronik",
  BODY: "Karosserie & Lack",
  PREP: "Aufbereitung",
};

const BASE_MINUTES_PER_DAY = 8 * 60; // 480
const BASE_AW_PER_DAY = 96;

function capacityFromPerformance(perfPct: number) {
  const minutes = Math.round((BASE_MINUTES_PER_DAY * (perfPct || 100)) / 100);
  const aw = Math.round((BASE_AW_PER_DAY * (perfPct || 100)) / 100);
  return { minutes, aw };
}

/* ---------------------------------------------
   Minimaler Hook (lokal) für /api/employees
---------------------------------------------- */
function useEmployees() {
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/employees", { cache: "no-store" });
      const data = await res.json();
      setList(data.employees ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  async function add(input: Omit<Employee, "id">) {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data?.error || "Speichern fehlgeschlagen");
    setList((prev) => [...prev, data.employee]);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/employees?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data?.error || "Löschen fehlgeschlagen");
    setList((prev) => prev.filter((e) => e.id !== id));
  }

  useEffect(() => {
    refresh();
  }, []);

  return { list, loading, error, add, remove, refresh };
}

/* ---------------------------------------------
   Dialog: Mitarbeiter anlegen
---------------------------------------------- */
function CreateEmployeeDialog({
  onCreate,
  disabled,
}: {
  onCreate: (input: { name: string; category: EmployeeCategory; performance: number }) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<EmployeeCategory>("MECH");
  const [performance, setPerformance] = useState(100);

  const cap = capacityFromPerformance(performance);

  async function submit() {
    const perf = Math.max(0, Math.min(300, Number(performance) || 100));
    await onCreate({ name: name.trim() || "Neuer Mitarbeiter", category, performance: perf });
    setOpen(false);
    setName("");
    setCategory("MECH");
    setPerformance(100);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button disabled={disabled}>+ Mitarbeiter</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>Mitarbeiter hinzufügen</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Max Mustermann" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Rubrik</div>
              <Select value={category} onValueChange={(v) => setCategory(v as EmployeeCategory)}>
                <SelectTrigger><SelectValue placeholder="Rubrik wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MECH">Mechatronik</SelectItem>
                  <SelectItem value="BODY">Karosserie & Lack</SelectItem>
                  <SelectItem value="PREP">Aufbereitung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Leistungsgrad (%)</div>
              <Input
                type="number"
                value={performance}
                min={0}
                max={300}
                onChange={(e) => setPerformance(Number(e.target.value))}
              />
              <div className="mt-1 text-[11px] text-muted-foreground">
                Kapazität: <b>{cap.minutes} Min</b> / <b>{cap.aw} AW</b> pro Tag
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={submit}>Hinzufügen</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------
   Seite
---------------------------------------------- */
export default function Page() {
  const { list: employees, loading, error, add, remove } = useEmployees();

  return (
    <div className="mx-auto max-w-[1000px] p-4 space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Aftersales Planner</h1>
          <Badge variant="secondary" className="rounded-full">MVP</Badge>
        </div>
      </div>

      {/* Einstellungen */}
      <Card className="rounded-2xl">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Einstellungen
            </CardTitle>
            <CardDescription>8 h / 96 AW pro Tag • Leistungsgrad-bereinigt</CardDescription>
          </div>
          <CreateEmployeeDialog onCreate={add} disabled={loading} />
        </CardHeader>

        <CardContent className="grid gap-3">
          {error && <div className="text-sm text-red-600">Fehler: {error}</div>}
          {loading && <div className="text-sm text-muted-foreground">Mitarbeiter werden geladen…</div>}

          {!loading && employees.length === 0 && (
            <div className="text-sm text-muted-foreground">Noch keine Mitarbeiter angelegt.</div>
          )}

          {!loading && employees.map((e) => {
            const cap = capacityFromPerformance(e.performance);
            return (
              <div key={e.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {CATEGORY_LABEL[e.category]} • {e.performance}% • Kapazität: {cap.minutes} Min / {cap.aw} AW pro Tag
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{e.category}</Badge>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => remove(e.id)}
                    title="Mitarbeiter löschen"
                  >
                    Löschen
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
