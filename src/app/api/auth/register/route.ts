export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { findUserByEmail, createUserMaster } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

type RegisterBody = {
  email: string;
  password: string;
  name?: string;
  role?: 'MASTER' | 'USER';
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<RegisterBody>;
    const email = body.email?.toLowerCase().trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'E-Mail und Passwort erforderlich' },
        { status: 400 }
      );
    }

    // existiert User schon?
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'Benutzer existiert bereits' },
        { status: 409 }
      );
    }

    // Passwort hashen (scrypt)
    const password_hash = await hashPassword(password);

    // MASTER-User anlegen (dein DB-Layer erwartet: (email, password_hash))
    const user = await createUserMaster(email, password_hash);

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err: unknown) {
    console.error('register error', err);
    return NextResponse.json(
      { ok: false, error: 'Registrierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
