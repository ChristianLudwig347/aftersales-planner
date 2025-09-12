// src/app/api/employees/route.ts
export const dynamic = 'force-dynamic'; // keine statische Seite cachen
export const runtime = 'nodejs';

type EmployeeCategory = 'MECH' | 'BODY' | 'PREP';
type Employee = { id: string; name: string; performance: number; category: EmployeeCategory };

declare global {
  // einfacher In-Memory-Store für den Test (lebt pro Server-Prozess)
  // Für echte Persistenz später: Postgres / Vercel KV.
  // @ts-ignore
  var __EMP_STORE__: Employee[] | undefined;
}

// @ts-ignore
const store: Employee[] = global.__EMP_STORE__ ?? (global.__EMP_STORE__ = []);

export async function GET() {
  return new Response(JSON.stringify(store), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name || !body?.performance || !body?.category) {
      return new Response(JSON.stringify({ error: 'name, performance, category required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    const emp: Employee = {
      id: `emp-${Date.now()}`,
      name: String(body.name),
      performance: Number(body.performance),
      category: body.category as EmployeeCategory,
    };
    store.push(emp);
    return new Response(JSON.stringify(emp), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
}
