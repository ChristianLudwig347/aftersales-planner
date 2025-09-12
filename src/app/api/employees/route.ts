// src/app/api/employees/route.ts
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureEmployeesTable } from "@/lib/db";

export async function GET() {
  await ensureEmployeesTable();
  const { rows } = await sql/* sql */`SELECT id, name, performance, category, created_at FROM employees ORDER BY created_at ASC`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  await ensureEmployeesTable();
  const body = await req.json().catch(() => ({}));
  const { name, performance, category } = body ?? {};

  if (!name || !performance || !category) {
    return NextResponse.json({ error: "name, performance, category required" }, { status: 400 });
  }

  const { rows } = await sql/* sql */`
    INSERT INTO employees (name, performance, category)
    VALUES (${name}, ${Number(performance)}, ${category})
    RETURNING id, name, performance, category, created_at
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
