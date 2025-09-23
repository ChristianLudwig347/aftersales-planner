// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  // Redirect auf /login nach erfolgreichem Logout
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://aftersales-planner.vercel.app";
  const res = NextResponse.redirect(new URL("/login", baseUrl));

  // Cookie löschen (leerer Wert + abgelaufenes Datum)
  res.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });

  return res;
}
