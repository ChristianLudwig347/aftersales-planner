import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { sql } from "@vercel/postgres";

const secretRaw = process.env.AUTH_SECRET;
const secret = secretRaw ? new TextEncoder().encode(secretRaw) : undefined;

async function requireMaster() {
  const tok = cookies().get("ae.session")?.value;
  if (!tok || !secret) throw new Error("UNAUTHORIZED");
  const { payload } = await jwtVerify(tok, secret, { algorithms: ["HS256"] });
  if (payload.role !== "MASTER") throw new Error("FORBIDDEN");
}

export async function GET() {
  const { rows } =
    await sql`SELECT timezone, opening FROM public.settings WHERE id = 1`;
  return NextResponse.json({ ok: true, settings: rows[0] ?? null });
}

export async function PUT(req: Request) {
  try {
    await requireMaster();

    const body = await req.json(); // { timezone, opening }
    const tz = body?.timezone ?? "Europe/Berlin";

    // Öffnungszeiten robust parsen
    const parsed =
      typeof body?.opening === "string"
        ? JSON.parse(body.opening)
        : body?.opening ?? {};

    // WICHTIG: als JSON stringifizieren und in jsonb casten
    await sql`
      UPDATE public.settings
         SET timezone  = ${tz},
             opening   = ${JSON.stringify(parsed)}::jsonb,
             updated_at = now()
       WHERE id = 1
    `;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const status =
      msg === "FORBIDDEN" ? 403 : msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
