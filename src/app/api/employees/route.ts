// src/app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { listEmployees, createEmployee, deleteEmployee } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EmployeeSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(['MECH', 'BODY', 'PREP']),
  performance: z.number().int().min(0).max(300),
});

// kleine Backwards-Compat: {rubric, efficiency} akzeptieren
function normalize(body: any) {
  if (body && body.rubric && body.efficiency != null) {
    return { name: body.name, category: body.rubric, performance: Number(body.efficiency) };
  }
  return body;
}

export async function GET() {
  try {
    const employees = await listEmployees();
    return NextResponse.json({ ok: true, employees });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = EmployeeSchema.parse(normalize(raw));
    const employee = await createEmployee(parsed);
    return NextResponse.json({ ok: true, employee }, { status: 201 });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json({ ok: false, error: 'Validation failed', issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    await deleteEmployee(id);
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
