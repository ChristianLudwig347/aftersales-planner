import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { z, ZodError } from "zod";
import {
  listEmployees,
  createEmployee,
  deleteEmployee,
  updateEmployee,
} from "@/lib/employees";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Utility für konsistente JSON-Antworten
function j(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/** Nur MASTER dürfen schreibende Aktionen */
async function requireMaster(req: NextRequest) {
  const cookie = req.cookies.get("ae.session")?.value;
  if (!cookie) return { ok: false as const, status: 401, error: "UNAUTHORIZED" };

  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false as const, status: 500, error: "MISSING_AUTH_SECRET" };

  try {
    const { payload } = await jwtVerify(cookie, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
      clockTolerance: 5,
    });
    if (payload?.role !== "MASTER") {
      return { ok: false as const, status: 403, error: "FORBIDDEN" };
    }
    return { ok: true as const, payload };
  } catch {
    return { ok: false as const, status: 401, error: "INVALID_SESSION" };
  }
}

// Zod: performance sicher in number konvertieren
const EmployeeSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["MECH", "BODY", "PREP"]),
  performance: z.coerce.number().int().min(0).max(300), // <— coerce: "100" -> 100
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

// Body-Parser der beide Content-Types kann
async function readBody(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await req.json();
  }
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    return Object.fromEntries(fd.entries());
  }
  // Fallback: versuchen JSON
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// ---- Handlers --------------------------------------------------------------

export async function GET() {
  try {
    const employees = await listEmployees();
    return j(200, { ok: true, employees });
  } catch (err: any) {
    return j(500, { ok: false, error: String(err?.message ?? err) });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireMaster(req);
  if (!guard.ok) return j(guard.status, { ok: false, error: guard.error });

  try {
    const raw = normalize(await readBody(req));
    const parsed = EmployeeSchema.parse(raw);
    const employee = await createEmployee(parsed);
    return j(201, { ok: true, employee });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return j(400, { ok: false, error: "Validation failed", issues: err.issues });
    }
    return j(500, { ok: false, error: String(err?.message ?? err) });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireMaster(req);
  if (!guard.ok) return j(guard.status, { ok: false, error: guard.error });

  try {
    const raw = normalize(await readBody(req));
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    if (!id) return j(400, { ok: false, error: "Missing id" });

    const patch = EmployeeSchema.partial().parse(rest);
    const employee = await updateEmployee(id, patch);
    if (!employee) return j(404, { ok: false, error: "Not found" });

    return j(200, { ok: true, employee });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return j(400, { ok: false, error: "Validation failed", issues: err.issues });
    }
    return j(500, { ok: false, error: String(err?.message ?? err) });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireMaster(req);
  if (!guard.ok) return j(guard.status, { ok: false, error: guard.error });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return j(400, { ok: false, error: "Missing id" });

    const ok = await deleteEmployee(id);
    if (!ok) return j(404, { ok: false, error: "Not found" });

    return j(200, { ok: true, id });
  } catch (err: any) {
    return j(500, { ok: false, error: String(err?.message ?? err) });
  }
}
