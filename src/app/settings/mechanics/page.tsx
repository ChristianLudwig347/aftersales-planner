import { headers, cookies } from "next/headers";
import { Button } from "@/components/ui/button";

type Employee = { id: string; name: string; category: "MECH"|"BODY"|"PREP"; performance: number };

function baseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(new URL(path, baseUrl()), {
    ...init,
    headers: { cookie: cookies().toString(), ...(init?.headers||{}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export default async function MechanicsPage() {
  const data = await api<{ employees: Employee[] }>("/api/employees");
  const employees = data.employees ?? [];

  return (
    <div className="mx-auto max-w-[900px] p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Mechaniker pflegen</h1>

      {/* Liste */}
      <table className="w-full text-sm border rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Kategorie</th>
            <th className="p-2 text-left">Leistung %</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="p-2">{e.name}</td>
              <td className="p-2">{e.category}</td>
              <td className="p-2">{e.performance}</td>
            </tr>
          ))}
          {employees.length === 0 && (
            <tr><td className="p-4 text-muted-foreground" colSpan={3}>Keine Einträge</td></tr>
          )}
        </tbody>
      </table>

      {/* Einfaches Formular zum Anlegen */}
      <form action="/api/employees" method="post" className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input name="name" placeholder="Name" className="border rounded-md px-3 py-2" required />
        <select name="category" className="border rounded-md px-3 py-2">
          <option value="MECH">MECH</option>
          <option value="BODY">BODY</option>
          <option value="PREP">PREP</option>
        </select>
        <input name="performance" type="number" min={1} max={200} defaultValue={100}
               className="border rounded-md px-3 py-2" />
        <Button type="submit">Anlegen</Button>
      </form>
    </div>
  );
}
