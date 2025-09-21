// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { countUsers, createUserMaster, findUserByEmail } from '../../../../lib/db';
import { hashPassword, signSession, SESSION_COOKIE } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password } = RegisterSchema.parse(body);

    // Nur erlauben, wenn noch KEIN User existiert
    const n = await countUsers();
    if (n > 0) {
      return NextResponse.json({ ok: false, error: 'already-initialized' }, { status: 403 });
    }

    const exists = await findUserByEmail(email);
    if (exists) return NextResponse.json({ ok: false, error: 'email-taken' }, { status: 409 });

    const password_hash = await hashPassword(password);
    const user = await createUserMaster({ email, name, password_hash });

    const token = await signSession({ sub: user.id, email: user.email, role: user.role });
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ ok: false, error: 'validation', issues: e.issues }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
