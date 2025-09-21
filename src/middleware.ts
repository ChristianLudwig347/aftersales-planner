// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

async function getSession(req: NextRequest) {
  const token = req.cookies.get("ae.session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as any; // { userId, email, role }
  } catch { return null; }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Öffentlich
  if (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json"
  ) return NextResponse.next();

  // Nur Settings (Seite + API) bewachen
  const guarded =
    pathname.startsWith("/settings") ||
    pathname.startsWith("/api/settings");

  if (!guarded) return NextResponse.next();

  const s = await getSession(req);
  if (!s) {
    const url = req.nextUrl.clone(); url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (s.role !== "MASTER") {
    const url = req.nextUrl.clone(); url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/settings", "/api/settings/:path*"], // Wichtig: KEIN /api/auth/*
};
