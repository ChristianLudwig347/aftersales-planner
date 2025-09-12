// src/app/api/employees/route.ts
import { NextResponse } from "next/server";

type EmployeeCategory = "MECH" | "BODY" | "PREP";
type Employee = { id: string; name: string; performance: number; category: EmployeeCategory };

// ⚠️ Demo-Speicher nur im Arbeitsspeicher (pro Server-Instance)
const store: Employee[] = [];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const dynamic = "force-dynamic"; // keine Caches

export async function GET() {
  return NextResponse.json(store, { headers: cors });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = body?.name?.toString()?.trim();
  const performance = Number(body?.performance ?? 100);
  const category = body?.category as EmployeeCategory;

  if (!name || !["MECH", "BODY", "PREP"].includes(category)) {
    return NextResponse.json({ error: "name/performance/category ungültig" }, { status: 400, headers: cors });
  }

  const emp: Employee = {
    id: `emp-${Date.now()}`,
    name,
    performance: Math.max(50, Math.min(150, performance)),
    category,
  };
  store.push(emp);
  return NextResponse.json(emp, { status: 201, headers: cors });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
