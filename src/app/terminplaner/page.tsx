"use client";

import { useCallback, useEffect, useState } from "react";

type Category = "MECH" | "BODY" | "PREP";

type DayEntry = {
  id: string;
  work_day: string;      // YYYY-MM-DD
  drop_off: string | null; // "HH:MM:SS"
  pick_up: string | null;  // "HH:MM:SS"
  title: string | null;
  work_text: string | null;
  category: Category;
  aw: number;
};

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export default function TerminplanerPage() {
  const [date, setDate] = useState<string>(todayISO());
  const [category, setCategory] = useState<Category>("MECH");
  const [form, setForm] = useState({
    title: "",
    work_text: "",
    drop_off: "08:00",
    pick_up: "16:30",
    aw: 0,
  });
  const [list, setList] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = `?from=${encodeURIComponent(date)}&to=${encodeURIComponent(
        date
      )}`;
      const res = await fetch(`/api/day-entries${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Load failed");
      setList(json.items ?? []);
    } catch (error: unknown) {
      setErr(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createEntry() {
    setLoading(true);
    setErr(null);
    try {
      const body = {
        work_day: date,
        drop_off: form.drop_off,
        pick_up: form.pick_up,
        title: form.title,
        work_text: form.work_text,
        category,
        aw: Number(form.aw) || 0,
      };
      const res = await fetch("/api/day-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json?.error || "Speichern fehlgeschlagen");

      setForm({ title: "", work_text: "", drop_off: "08:00", pick_up: "16:30", aw: 0 });
      await load();
    } catch (error: unknown) {
      setErr(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function removeEntry(id: string) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/day-entries?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json?.error || "Löschen fehlgeschlagen");
      await load();
    } catch (error: unknown) {
      setErr(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Terminplaner</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Formular */}
        <div className="rounded border p-3 space-y-3">
          <div>
            <div className="text-xs text-gray-500">Datum</div>
            <input
              type="date"
              className="border rounded p-2 w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500">Rubrik</div>
            <select
              className="border rounded p-2 w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              <option value="MECH">Mechatronik</option>
              <option value="BODY">Karosserie &amp; Lack</option>
              <option value="PREP">Aufbereitung</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-gray-500">Titel</div>
            <input
              className="border rounded p-2 w-full"
              placeholder="z. B. Golf VII"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500">Werkstattaufwand (Text)</div>
            <textarea
              className="border rounded p-2 w-full"
              rows={3}
              value={form.work_text}
              onChange={(e) => setForm({ ...form, work_text: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500">Abgabe</div>
              <input
                type="time"
                className="border rounded p-2 w-full"
                value={form.drop_off}
                onChange={(e) => setForm({ ...form, drop_off: e.target.value })}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500">Abholung</div>
              <input
                type="time"
                className="border rounded p-2 w-full"
                value={form.pick_up}
                onChange={(e) => setForm({ ...form, pick_up: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">AW</div>
            <input
              type="number"
              min={0}
              className="border rounded p-2 w-full"
              value={form.aw}
              onChange={(e) =>
                setForm({ ...form, aw: Number(e.target.value) || 0 })
              }
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={createEntry}
              disabled={loading}
              className="px-3 py-2 rounded bg-black text-white"
            >
              {loading ? "Speichert…" : "Eintrag anlegen"}
            </button>
          </div>

          {err && <div className="text-sm text-red-600">Fehler: {err}</div>}
        </div>

        {/* Liste */}
        <div className="md:col-span-1 lg:col-span-2 rounded border p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">Einträge am {date}</h2>
            <button onClick={load} className="text-sm underline">
              Neu laden
            </button>
          </div>

          {loading && <div className="text-sm text-gray-500">Lade…</div>}
          {!loading && list.length === 0 && (
            <div className="text-sm text-gray-500">Keine Einträge.</div>
          )}

          <ul className="space-y-2">
            {list.map((it) => (
              <li
                key={it.id}
                className="border rounded p-2 flex items-start justify-between"
              >
                <div>
                  <div className="text-sm font-medium">
                    {it.title || "(ohne Titel)"} · {it.category} · {it.aw} AW
                  </div>
                  <div className="text-xs text-gray-600">
                    {it.drop_off?.slice(0, 5)}–{it.pick_up?.slice(0, 5)} ·{" "}
                    {it.work_text}
                  </div>
                </div>
                <button
                  onClick={() => removeEntry(it.id)}
                  className="text-xs text-red-600"
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
