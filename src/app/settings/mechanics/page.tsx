// src/app/settings/mechanics/page.tsx
import { headers, cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import MechanicsTable from "./MechanicsTable";

export const dynamic = "force-dynamic";

type EmployeeCategory = "MECH" | "BODY" | "PREP";
export type Employee = {
  id: string;
  name: string;
  category: EmployeeCategory;
  performance: number;
};

// ----- fetch helpers (Cookie-Forwarding im Server-Context) -----
function baseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}
async function api<T>(path: string): Promise<T> {
  const res = await fetch(new URL(path, baseUrl()), {
    cache: "no-store",
    headers: { cookie: cookies().toString() },
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export default async function MechanicsPage() {
  const session = await getSession();
  const canEdit = session?.role === "MASTER";

  const data = await api<{ employees: Employee[] }>("/api/employees");
  const employees = data.employees ?? [];

  return (
    <div className="mx-auto max-w-[1000px] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mechaniker</h1>
        {!canEdit && (
          <span className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-2 py-1">
            Nur <b>MASTER</b> dürfen ändern
          </span>
        )}
      </div>

      <MechanicsTable initial={employees} canEdit={canEdit} />
    </div>
  );
}
