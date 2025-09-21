import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { sql } from "@vercel/postgres";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

async function requireMaster() {
  const tok = cookies().get("ae.session")?.value;
  if (!tok) throw new Error("NO_SESSION");
  const { payload } = await jwtVerify(tok, secret);
  if (payload.role !== "MASTER") throw new Error("FORBIDDEN");
}

export async function GET() {
  const { rows } = await sql`SELECT timezone, opening FROM public.settings WHERE id = 1`;
  return NextResponse.json({ ok: true, settings: rows[0] ?? null });
}

export async function PUT(req: Request) {
  try {
    await requireMaster();
    const body = await req.json(); // { timezone, opening }
    await sql`
      UPDATE public.settings
      SET timezone = ${body.timezone}, opening = ${body.opening}::jsonb, updated_at = now()
      WHERE id = 1`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const code = e.message === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ ok: false, error: e.message }, { status: code });
  }
}
