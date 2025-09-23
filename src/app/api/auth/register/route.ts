export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { findUserByEmail, createUserMaster } from '@/lib/db';
import { hashPassword } from '@/lib/auth'; // Name anpassen, falls anders

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email as string)?.toLowerCase().trim();
    const password = body.password as string;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'E-Mail und Passwort erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen, ob User schon existiert
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'Benutzer existiert bereits' },
        { status: 409 }
      );
    }

    // Passwort hashen (scrypt aus lib/auth.ts)
    const password_hash = await hashPassword(password);

    // neuen MASTER-User anlegen
    const user = await createUserMaster(email, password_hash);

    return NextResponse.json(
      {
        ok: true,
        user,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('register error', err);
    return NextResponse.json(
      { ok: false, error: err.message ?? 'Registrierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
