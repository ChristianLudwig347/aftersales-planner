export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { findUserByEmail, createUserMaster } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

type RegisterBody = {
  email: string;
  password: string;
  name?: string;
  role?: 'admin' | 'user';
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<RegisterBody>;
    const email = body.email?.toLowerCase().trim();
    const password = body.password ?? '';
    const name = body.name ?? '';
    const role = (body.role as RegisterBody['role']) ?? 'user';

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

    // Passwort hashen (scrypt, aus lib/auth.ts)
    const hashed = await hashPassword(password);

    // anlegen
    const user = await createUserMaster({
      email,
      password: hashed,
      name,
      role,
    });

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('register error', err);
    return NextResponse.json(
      { ok: false, error: 'Registrierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
