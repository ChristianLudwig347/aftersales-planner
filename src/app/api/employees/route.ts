import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { z, ZodError } from "zod";
import {
  listEmployees,
  createEmployee,
  deleteEmployee,
  updateEmployee,
} from "@/lib/employees"; // <— neu: eigene DB-Schicht

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Nur MASTER dürfen schreibende Aktionen */
async function requireMaster(req: NextRequest) {
  const cookie = req.cookies.get("ae.session")?.value;
  if (!cookie) return { ok: false as const, status: 401, error: "UNAUTHORIZED" };

  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false as const, status: 500, error: "MISSING_AUTH_SECRET" };

  try {
    const { payload } = await jwtVerify(
      cookie,
      new TextEncoder().encode(secret)
    );
    if (payload?.role !== "MASTER") {
      return { ok: false as const, status: 403, error: "FORBIDDEN" };
    }
    return { ok: true as const, payload };
  } catch {
    return { ok: false as const, status: 401, error: "INVALID_SESSION" };
  }
}

const EmployeeSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["MECH", "BODY", "PREP"]),
  performance: z.number().int().min(0).max(300),
});

// Backwards-Compat: {rubric, efficiency}
function normalize(body: any) {
  if (body && body.rubric && body.efficiency != null) {
    return {
      name: body.name,
      category: body.rubric,
      performance: Number(body.efficiency),
    };
  }
  return body;
}

export async function GET() {
  try {
    const employees = await listEmployees();
    return NextResponse.json({ ok: true, employees });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireMaster(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  try {
    const raw = await req.json();
    const parsed = EmployeeSchema.parse(normalize(raw));
    const employee = await createEmployee(parsed);
    return NextResponse.json({ ok: true, employee }, { status: 201 });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireMaster(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  try {
    const raw = await req.json();
    const { id, ...rest } = raw || {};
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }
    const patch = EmployeeSchema.partial().parse(normalize(rest));
    const employee = await updateEmployee(id, patch);
    if (!employee) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, employee });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireMaster(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }
    const ok = await deleteEmployee(id);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
