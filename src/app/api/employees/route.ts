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
function normalize(body: unknown) {
  if (
    body &&
    typeof body === "object" &&
    "rubric" in body &&
    "efficiency" in body
  ) {
    const legacy = body as {
      name?: unknown;
      rubric?: unknown;
      efficiency?: unknown;
    };
    return {
      name: legacy.name,
      category: legacy.rubric,
      performance: legacy.efficiency,
    };
  }
  return body;
}

// Body-Parser der beide Content-Types kann
async function readBody(req: NextRequest): Promise<unknown> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await req.json();
  }
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const record: Record<string, unknown> = {};
    for (const [key, value] of fd.entries()) {
      record[key] = value;
    }
    return record;
  }
  // Fallback: versuchen JSON
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// ---- Handlers --------------------------------------------------------------

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export async function GET() {
  try {
    const employees = await listEmployees();
    return j(200, { ok: true, employees });
  } catch (error: unknown) {
    return j(500, { ok: false, error: toErrorMessage(error) });
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return j(400, { ok: false, error: "Validation failed", issues: error.issues });
    }
    return j(500, { ok: false, error: toErrorMessage(error) });
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return j(400, { ok: false, error: "Validation failed", issues: error.issues });
    }
    return j(500, { ok: false, error: toErrorMessage(error) });
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
  } catch (error: unknown) {
    return j(500, { ok: false, error: toErrorMessage(error) });
  }
}
