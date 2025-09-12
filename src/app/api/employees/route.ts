// src/app/api/employees/route.ts
import { NextResponse } from "next/server";
import { loadEmployees, saveEmployees } from "@/lib/db";

export const dynamic = "force-dynamic"; // kein Caching

export async function GET() {
  const data = await loadEmployees();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name || !body?.performance || !body?.category) {
    return NextResponse.json({ error: "name, performance, category required" }, { status: 400 });
  }
  const list = await loadEmployees();
  const item = {
    id: `emp-${Math.floor(10000 + Math.random() * 89999)}`,
    name: String(body.name),
    performance: Number(body.performance),
    category: String(body.category),
  };
  list.push(item);
  await saveEmployees(list);
  return NextResponse.json(item, { status: 201 });
}
