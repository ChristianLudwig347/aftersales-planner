// src/lib/db.ts
// Minimal-DB-Layer für Users & Employees auf Vercel Postgres/Neon.

import { sql } from "@vercel/postgres";

// ----------- Typen -----------
export type Role = "MASTER" | "USER";

export type EmployeeCategory = "MECH" | "BODY" | "PREP";

export type Employee = {
  id: string;
  name: string;
  category: EmployeeCategory;
  performance: number; // 0..300 (%)
};

// ----------- USERS -----------
export async function countUsers(): Promise<number> {
  const { rows } = await sql`SELECT COUNT(*)::int AS count FROM users`;
  return rows?.[0]?.count ?? 0;
}

export async function findUserByEmail(email: string): Promise<{
  id: string;
  email: string;
  role: Role;
  password_hash: string | null;
} | null> {
  const { rows } = await sql`
    SELECT id, email, role, password_hash
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows?.[0] ?? null;
}

export async function createUserMaster(
  email: string,
  password_hash: string
): Promise<{ id: string; email: string; role: Role }> {
  const { rows } = await sql`
    INSERT INTO users (id, email, password_hash, role)
    VALUES (gen_random_uuid(), ${email}, ${password_hash}, 'MASTER')
    RETURNING id, email, role
  `;
  return rows[0];
}

// ----------- EMPLOYEES -----------
export async function listEmployees(): Promise<Employee[]> {
  const { rows } = await sql<Employee>`
    SELECT id, name, category, performance
    FROM employees
    ORDER BY name
  `;
  return rows;
}

export async function createEmployee(input: {
  name: string;
  category: EmployeeCategory;
  performance: number;
}): Promise<Employee> {
  const { rows } = await sql<Employee>`
    INSERT INTO employees (id, name, category, performance)
    VALUES (gen_random_uuid(), ${input.name}, ${input.category}, ${input.performance})
    RETURNING id, name, category, performance
  `;
  return rows[0];
}

export async function updateEmployee(
  id: string,
  patch: Partial<{
    name: string;
    category: EmployeeCategory;
    performance: number;
  }>
): Promise<Employee | null> {
  const sets = [];
  if (patch.name !== undefined) sets.push(sql`name = ${patch.name}`);
  if (patch.category !== undefined) sets.push(sql`category = ${patch.category}`);
  if (patch.performance !== undefined) sets.push(sql`performance = ${patch.performance}`);

  if (sets.length === 0) {
    // Nichts zu updaten → aktuellen Datensatz zurückgeben
    const { rows } = await sql<Employee>`
      SELECT id, name, category, performance
      FROM employees
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  const { rows } = await sql<Employee>`
    UPDATE employees
    SET ${sql.join(sets, sql`, `)}
    WHERE id = ${id}
    RETURNING id, name, category, performance
  `;
  return rows[0] ?? null;
}

export async function deleteEmployee(id: string): Promise<void> {
  await sql`DELETE FROM employees WHERE id = ${id}`;
}
