import { useCallback, useEffect, useState } from "react";

/** Minimales Shape – passt zu deiner API */
type EmployeeCategory = "MECH" | "BODY" | "PREP";
type Employee = { id: string; name: string; performance: number; category: EmployeeCategory };

const API = "/api/employees";

/** Client-Hook: Laden + Mutations mit optimistischen Updates */
export function useEmployees() {
  const [data, setData] = useState<Employee[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  /** akzeptiert auch Objekte mit id – serverseitig wird nur name/performance/category genutzt */
  const createEmployee = useCallback(
    async (input: { name: string; performance: number; category: EmployeeCategory } | any) => {
      const payload = {
        name: input.name,
        performance: input.performance,
        category: input.category as EmployeeCategory,
      };

      // Optimistisch einfügen
      const tmpId = `tmp-${Date.now()}`;
      setData((prev) => [{ id: tmpId, ...payload }, ...prev]);

      try {
        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: Employee = await res.json();
        setData((prev) => [created, ...prev.filter((e) => e.id !== tmpId)]);
        return created;
      } catch (e) {
        // Rollback
        setData((prev) => prev.filter((e) => e.id !== tmpId));
        throw e;
      }
    },
    []
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      const snapshot = data;
      setData((prev) => prev.filter((e) => e.id !== id));
      try {
        const res = await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
      } catch (e) {
        // Rollback
        setData(snapshot);
        throw e;
      }
    },
    [data]
  );

  return { data, isLoading, error, refetch, createEmployee, deleteEmployee };
}
