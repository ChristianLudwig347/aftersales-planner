import { sql } from "@vercel/postgres";

export type EmployeeCategory = "MECH" | "BODY" | "PREP";

export type Employee = {
  id: string;
  name: string;
  category: EmployeeCategory;
  performance: number; // 0..300
};

export async function listEmployees(): Promise<Employee[]> {
  const { rows } = await sql<Employee>`
    SELECT id, name, category, performance
    FROM employees
    ORDER BY name;
  `;
  return rows as Employee[];
}

export async function createEmployee(
  input: Omit<Employee, "id">
): Promise<Employee> {
  const { rows } = await sql<Employee>`
    INSERT INTO employees (name, category, performance)
    VALUES (${input.name}, ${input.category}, ${input.performance})
    RETURNING id, name, category, performance;
  `;
  return rows[0];
}

// Patch-Update – nicht übergebene Felder bleiben unverändert
export async function updateEmployee(
  id: string,
  patch: Partial<Omit<Employee, "id">>
): Promise<Employee | null> {
  const { rows } = await sql<Employee>`
    UPDATE employees SET
      name        = COALESCE(${patch.name},        name),
      category    = COALESCE(${patch.category},    category),
      performance = COALESCE(${patch.performance}, performance)
    WHERE id = ${id}
    RETURNING id, name, category, performance;
  `;
  return rows[0] ?? null;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const { rows } = await sql<{ id: string }>`
    DELETE FROM employees WHERE id = ${id}
    RETURNING id;
  `;
  return rows.length > 0;
}
