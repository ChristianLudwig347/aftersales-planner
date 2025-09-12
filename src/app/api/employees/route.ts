// src/app/api/employees/route.ts
import { NextResponse } from "next/server";
import { addEmployee, getEmployees, Employee } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(getEmployees(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Omit<Employee, "id">;
  // minimale Validierung
  if (!body?.name || !body?.performance || !body?.category) {
    return NextResponse.json({ error: "name, performance, category required" }, { status: 400 });
  }
  const created = addEmployee(body);
  return NextResponse.json(created, { status: 201 });
}
