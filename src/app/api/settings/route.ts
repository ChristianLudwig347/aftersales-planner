// src/app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function j(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

async function requireMaster(req: NextRequest) {
  const token = req.cookies.get("ae.session")?.value;
  if (!token) return { ok: false as const, status: 401, error: "UNAUTHORIZED" };

  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false as const, status: 500, error: "MISSING_AUTH_SECRET" };

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
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

async function readBody(req: NextRequest): Promise<unknown> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await req.json();
  }
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const obj: Record<string, unknown> = {};
    for (const [key, value] of fd.entries()) {
      obj[key] = value;
    }
    if (typeof obj.opening === "string") {
      try {
        obj.opening = JSON.parse(obj.opening);
      } catch {
        // handled later
      }
    }
    return obj;
  }
  try { return await req.json(); } catch { return null; }
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export async function GET() {
  try {
    const { rows } = await sql`SELECT timezone, opening FROM public.settings WHERE id = 1`;
    return j(200, { ok: true, settings: rows[0] ?? null });
  } catch (error: unknown) {
    return j(500, { ok: false, error: toErrorMessage(error) });
  }
}

export async function PUT(req: NextRequest) {
  const guard = await requireMaster(req);
  if (!guard.ok) return j(guard.status, { ok: false, error: guard.error });

  try {
    const rawBody = (await readBody(req)) ?? {};
    const body =
      typeof rawBody === "object" && rawBody !== null
        ? (rawBody as Record<string, unknown>)
        : {};
    const timezoneCandidate = body.timezone;
    const tz =
      typeof timezoneCandidate === "string" && timezoneCandidate.trim()
        ? timezoneCandidate.trim()
      : "Europe/Berlin";

    let opening = body.opening;
    if (typeof opening === "string") {
      try { opening = JSON.parse(opening); } catch {
        return j(400, { ok: false, error: "OPENING_JSON_INVALID" });
      }
    }
    if (opening == null || typeof opening !== "object") {
      return j(400, { ok: false, error: "OPENING_REQUIRED" });
    }

    // In JSONB schreiben
    await sql`
      UPDATE public.settings
         SET timezone = ${tz},
             opening  = ${JSON.stringify(opening)}::jsonb,
             updated_at = now()
       WHERE id = 1`;

    const { rows } = await sql`SELECT timezone, opening FROM public.settings WHERE id = 1`;
    return j(200, { ok: true, settings: rows[0] ?? null });
  } catch (error: unknown) {
    return j(500, { ok: false, error: toErrorMessage(error) });
  }
}
