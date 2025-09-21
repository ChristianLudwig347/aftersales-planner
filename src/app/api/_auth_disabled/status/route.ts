// src/app/api/auth/status/route.ts
import { NextResponse } from 'next/server';
import { countUsers } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const n = await countUsers();
  return NextResponse.json({ ok: true, initialized: n > 0 });
}
