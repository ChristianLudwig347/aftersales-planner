export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/db';
import {
  comparePassword,
  signSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const user = await findUserByEmail(String(email ?? '').toLowerCase().trim());
    if (!user?.password_hash) {
      return NextResponse.json({ ok: false, error: 'Ungültige Zugangsdaten' }, { status: 401 });
    }

    const ok = await comparePassword(String(password ?? ''), user.password_hash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Ungültige Zugangsdaten' }, { status: 401 });
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ ok: false, error: 'Login fehlgeschlagen' }, { status: 500 });
  }
}
