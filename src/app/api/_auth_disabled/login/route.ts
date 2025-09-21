// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { SignJWT } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

type DBUser = { id: string; email: string; role: "MASTER" | "USER" };

/**
 * Liest Credentials aus JSON ODER x-www-form-urlencoded.
 */
async function readCreds(req: Request) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const raw = await req.text();
  let email: string | undefined;
  let password: string | undefined;

  if (ct.includes("application/json")) {
    try {
      const j = JSON.parse(raw);
      email = j?.email;
      password = j?.password;
    } catch {
      // ignore
    }
  }
  if ((!email || !password) && (ct.includes("x-www-form-urlencoded") || raw.includes("="))) {
    const p = new URLSearchParams(raw);
    email = email ?? p.get("email") ?? undefined;
    password = password ?? p.get("password") ?? undefined;
  }

  email = email?.trim();
  password = password?.trim();
  return { email, password };
}

/**
 * POST /api/auth/login
 * Prüft Passwort direkt in Postgres via pgcrypto (crypt()),
 * erzeugt JWT und setzt Cookie am Response.
 */
export async function POST(req: Request) {
  try {
    const { email, password } = await readCreds(req);
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "MISSING_CREDENTIALS" }, { status: 400 });
    }

    // Passwortprüfung direkt in SQL (kein bcryptjs nötig)
    const { rows } = await sql<DBUser>`
      SELECT id, email, role
      FROM public.users
      WHERE LOWER(email) = LOWER(${email})
        AND password_hash = crypt(${password}, password_hash)
      LIMIT 1;
    `;

    const user = rows[0];
    if (!user) {
      return NextResponse.json({ ok: false, error: "INVALID_LOGIN" }, { status: 401 });
    }

    const jwt = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // Cookie am Response setzen (vermeidet Next-Warnung)
    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set("ae.session", jwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("LOGIN_ERROR:", e);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/login
 * Logout: Cookie leeren.
 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set("ae.session", "", { expires: new Date(0), path: "/" });
  return res;
}
