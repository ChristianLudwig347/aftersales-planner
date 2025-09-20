import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({
    okPG: Boolean(process.env.POSTGRES_URL),
    okDB: Boolean(process.env.DATABASE_URL),
  });
}
