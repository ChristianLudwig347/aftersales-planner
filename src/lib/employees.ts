import { sql } from "@vercel/postgres";

export type EmployeeCategory = "MECH" | "BODY" | "PREP";

export type Employee = {
  id: string;
  name: string;
  category: EmployeeCategory;
  performance: number; // 0..300
};

function cleanName(name: string) {
  return name?.trim();
}
function toInt(n: unknown) {
  const v = typeof n === "string" ? parseInt(n, 10) : Number(n);
  return Number.isFinite(v) ? v : NaN;
}

export async function listEmployees(): Promise<Employee[]> {
  const { rows } = await sql<Employee>`
    SELECT id, name, category, performance
    FROM employees
    ORDER BY name ASC;
  `;
  return rows;
}

export async function createEmployee(
  input: Omit<Employee, "id">
): Promise<Employee> {
  const name = cleanName(input.name);
  const performance = toInt(input.performance);
  const category = input.category;

  const { rows } = await sql<Employee>`
    INSERT INTO employees (name, category, performance)
    VALUES (${name}, ${category}, ${performance})
    RETURNING id, name, category, performance;
  `;
  return rows[0];
}

export async function updateEmployee(
  id: string,
  patch: Partial<Omit<Employee, "id">>
): Promise<Employee | null> {
  const name =
    patch.name !== undefined ? cleanName(patch.name) : undefined;
  const performance =
    patch.performance !== undefined ? toInt(patch.performance) : undefined;
  const category = patch.category;

  const { rows } = await sql<Employee>`
    UPDATE employees SET
      name        = COALESCE(${name},        name),
      category    = COALESCE(${category},    category),
      performance = COALESCE(${performance}, performance)
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
