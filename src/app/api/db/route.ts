import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Fallback: akzeptiere DATABASE_URL oder POSTGRES_URL
    if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
      process.env.POSTGRES_URL = process.env.DATABASE_URL;
    }
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({ ok: false, where: 'env', msg: 'POSTGRES_URL missing' }, { status: 500 });
    }
    const { rows } = await sql`select current_database() as db, current_user as usr, now() as ts`;
    return NextResponse.json({ ok: true, where: 'db', ...rows[0] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, where: 'db', msg: String(e?.message ?? e) }, { status: 500 });
  }
}
