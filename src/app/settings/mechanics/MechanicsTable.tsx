// src/app/settings/mechanics/MechanicsTable.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type EmployeeCategory = "MECH" | "BODY" | "PREP";
type Employee = { id: string; name: string; category: EmployeeCategory; performance: number };

const CAT_LABEL: Record<EmployeeCategory, string> = {
  MECH: "Mechatronik",
  BODY: "Karosserie & Lack",
  PREP: "Aufbereitung",
};

export default function MechanicsTable({
  initial,
  canEdit,
}: {
  initial: Employee[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Employee[]>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Create-Form
  const [cName, setCName] = useState("");
  const [cCat, setCCat] = useState<EmployeeCategory>("MECH");
  const [cPerf, setCPerf] = useState<number>(100);

  // Edit-Map: id -> draft
  const [editing, setEditing] = useState<
    Record<string, { name: string; category: EmployeeCategory; performance: number }>
  >({});

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name, "de")),
    [rows]
  );

  // ---- Create
  async function createEmployee() {
    setMsg(null);
    const body = { name: cName.trim(), category: cCat, performance: Number(cPerf) };
    if (!body.name) return setMsg("Name ist erforderlich.");
    startTransition(async () => {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) return setMsg(`Anlegen fehlgeschlagen: ${j?.error ?? res.status}`);
      setRows((cur) => [...cur, j.employee as Employee]);
      setCName("");
      setCCat("MECH");
      setCPerf(100);
      setMsg("Angelegt.");
      router.refresh();
    });
  }

  // ---- Edit
  function startEdit(e: Employee) {
    setEditing((m) => ({ ...m, [e.id]: { name: e.name, category: e.category, performance: e.performance } }));
  }
  function cancelEdit(id: string) {
    setEditing(({ [id]: _, ...rest }) => rest);
  }
  async function saveEdit(id: string) {
    setMsg(null);
    const patch = editing[id];
    if (!patch) return;
    if (!patch.name.trim()) return setMsg("Name darf nicht leer sein.");
    startTransition(async () => {
      const res = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) return setMsg(`Speichern fehlgeschlagen: ${j?.error ?? res.status}`);
      setRows((cur) => cur.map((r) => (r.id === id ? (j.employee as Employee) : r)));
      cancelEdit(id);
      setMsg("Gespeichert.");
      router.refresh();
    });
  }

  // ---- Delete
  async function remove(id: string) {
    setMsg(null);
    if (!confirm("Diesen Mitarbeiter wirklich löschen?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/employees?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) return setMsg(`Löschen fehlgeschlagen: ${j?.error ?? res.status}`);
      setRows((cur) => cur.filter((r) => r.id !== id));
      setMsg("Gelöscht.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Liste */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Kategorie</th>
              <th className="p-2 text-left">Leistung&nbsp;%</th>
              <th className="p-2 text-left w-[220px]">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => {
              const edit = editing[e.id];
              const isEditing = !!edit;
              return (
                <tr key={e.id} className="border-t">
                  <td className="p-2 align-middle">
                    {isEditing ? (
                      <input
                        className="w-full border rounded-md px-2 py-1"
                        value={edit.name}
                        onChange={(ev) => setEditing((m) => ({ ...m, [e.id]: { ...m[e.id], name: ev.target.value } }))}
                        disabled={!canEdit || pending}
                      />
                    ) : (
                      e.name
                    )}
                  </td>
                  <td className="p-2 align-middle">
                    {isEditing ? (
                      <select
                        className="border rounded-md px-2 py-1"
                        value={edit.category}
                        onChange={(ev) =>
                          setEditing((m) => ({
                            ...m,
                            [e.id]: { ...m[e.id], category: ev.target.value as EmployeeCategory },
                          }))
                        }
                        disabled={!canEdit || pending}
                      >
                        <option value="MECH">{CAT_LABEL.MECH}</option>
                        <option value="BODY">{CAT_LABEL.BODY}</option>
                        <option value="PREP">{CAT_LABEL.PREP}</option>
                      </select>
                    ) : (
                      CAT_LABEL[e.category]
                    )}
                  </td>
                  <td className="p-2 align-middle">
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        max={300}
                        className="w-24 border rounded-md px-2 py-1"
                        value={edit.performance}
                        onChange={(ev) =>
                          setEditing((m) => ({
                            ...m,
                            [e.id]: { ...m[e.id], performance: Number(ev.target.value) },
                          }))
                        }
                        disabled={!canEdit || pending}
                      />
                    ) : (
                      e.performance
                    )}
                  </td>
                  <td className="p-2 align-middle">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button variant="default" size="sm" onClick={() => saveEdit(e.id)} disabled={!canEdit || pending}>
                          {pending ? "Speichere…" : "Speichern"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => cancelEdit(e.id)} disabled={pending}>
                          Abbrechen
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(e)} disabled={!canEdit}>
                          Bearbeiten
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => remove(e.id)} disabled={!canEdit || pending}>
                          Löschen
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={4}>
                  Keine Einträge.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Anlegen */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="font-medium">Neuen Mitarbeiter anlegen</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            name="name"
            placeholder="Name"
            className="border rounded-md px-3 py-2"
            value={cName}
            onChange={(e) => setCName(e.target.value)}
            disabled={!canEdit || pending}
          />
          <select
            name="category"
            className="border rounded-md px-3 py-2"
            value={cCat}
            onChange={(e) => setCCat(e.target.value as EmployeeCategory)}
            disabled={!canEdit || pending}
          >
            <option value="MECH">{CAT_LABEL.MECH}</option>
            <option value="BODY">{CAT_LABEL.BODY}</option>
            <option value="PREP">{CAT_LABEL.PREP}</option>
          </select>
          <input
            name="performance"
            type="number"
            min={0}
            max={300}
            className="border rounded-md px-3 py-2"
            value={cPerf}
            onChange={(e) => setCPerf(Number(e.target.value))}
            disabled={!canEdit || pending}
          />
          <Button onClick={createEmployee} disabled={!canEdit || pending}>
            {pending ? "Anlegen…" : "Anlegen"}
          </Button>
        </div>
      </div>

      {msg && <div className="text-sm text-muted-foreground">{msg}</div>}
    </div>
  );
}
