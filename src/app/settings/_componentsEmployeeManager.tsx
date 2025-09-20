"use client";
import { useEffect, useState } from "react";

type Employee = {
  id: string;
  name: string;
  category: "MECH" | "BODY" | "PREP";
  performance: number;
};

const CATEGORIES: Array<Employee["category"]> = ["MECH", "BODY", "PREP"];

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formular-State
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Employee["category"]>("MECH");
  const [performance, setPerformance] = useState<number>(100);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees", { cache: "no-store" });
      const data = await res.json();
      setEmployees(data.employees ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, performance }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Speichern fehlgeschlagen");
      setName("");
      setCategory("MECH");
      setPerformance(100);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Mitarbeiter wirklich löschen?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/employees?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Löschen fehlgeschlagen");
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      setError(e?.message ?? "Löschen fehlgeschlagen");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Mitarbeiter</h2>
        <span className="text-sm text-neutral-500">{employees.length} angelegt</span>
      </div>

      {/* Formular Neu */}
      <form onSubmit={createEmployee} className="grid gap-3 sm:grid-cols-4 border rounded-xl p-4">
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Name</label>
          <input
            required
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="z. B. Max Muster"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Bereich</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={category}
            onChange={e => setCategory(e.target.value as Employee["category"])}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Leistungsgrad (%)</label>
          <input
            type="number"
            min={0}
            max={300}
            className="w-full border rounded px-3 py-2"
            value={performance}
            onChange={e => setPerformance(Number(e.target.value))}
          />
        </div>
        <div className="sm:col-span-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-60"
          >
            {saving ? "Speichere…" : "Mitarbeiter anlegen"}
          </button>
          {error && <span className="ml-3 text-red-600 text-sm">{error}</span>}
        </div>
      </form>

      {/* Liste */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-sm text-neutral-500">Lade…</div>
        ) : employees.length === 0 ? (
          <div className="text-sm text-neutral-500">Noch keine Mitarbeiter angelegt.</div>
        ) : (
          employees.map(e => (
            <div key={e.id} className="flex items-center justify-between border rounded-xl p-3">
              <div>
                <div className="font-medium">{e.name}</div>
                <div className="text-sm text-neutral-600">Bereich: {e.category} • Leistungsgrad: {e.performance}%</div>
              </div>
              <button
                onClick={() => remove(e.id)}
                className="text-red-600 hover:underline"
                title="Löschen"
              >
                Löschen
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
