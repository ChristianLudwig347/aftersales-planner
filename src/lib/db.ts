// src/lib/db.ts
import { sql } from '@vercel/postgres';

type EmployeeRow = {
  id: string;
  name: string;
  category: 'MECH' | 'BODY' | 'PREP';
  performance: number;
  created_at: string;
  updated_at: string;
};

// Einmalig sicherstellen, dass die Tabelle existiert (idempotent).
async function ensureSchema() {
  // ⚠️ wichtig für gen_random_uuid()
  await sql/* sql */`create extension if not exists pgcrypto;`;

  await sql/* sql */`
    create table if not exists employees (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      category text not null check (category in ('MECH','BODY','PREP')),
      performance int not null check (performance >= 0 and performance <= 300),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await sql/* sql */`create index if not exists idx_employees_category on employees(category);`;
  await sql/* sql */`create index if not exists idx_employees_created_at on employees(created_at desc);`;
}

export async function listEmployees(): Promise<EmployeeRow[]> {
  await ensureSchema();
  const { rows } = await sql<EmployeeRow>`
    select id, name, category, performance, created_at, updated_at
    from employees
    order by name asc;
  `;
  return rows;
}

export async function createEmployee(input: {
  name: string;
  category: 'MECH' | 'BODY' | 'PREP';
  performance: number;
}): Promise<EmployeeRow> {
  await ensureSchema();
  const { name, category, performance } = input;

  const { rows } = await sql<EmployeeRow>`
    insert into employees (name, category, performance)
    values (${name}, ${category}, ${performance})
    returning id, name, category, performance, created_at, updated_at;
  `;
  return rows[0];
}

export async function deleteEmployee(id: string): Promise<void> {
  await ensureSchema();
  await sql/* sql */`delete from employees where id = ${id};`;
}
