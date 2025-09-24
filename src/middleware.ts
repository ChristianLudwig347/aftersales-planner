// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secretRaw = process.env.AUTH_SECRET;
const secret = secretRaw ? new TextEncoder().encode(secretRaw) : undefined;

// ---- Helpers ---------------------------------------------------------------

async function getSession(req: NextRequest) {
  const token = req.cookies.get("ae.session")?.value;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],        // an dein Signaturverfahren anpassen
      clockTolerance: 5,            // 5s Toleranz gegen Clock Skew
    });
    // erwartet: { userId, email, role, ... }
    return payload as any;
  } catch {
    return null;
  }
}

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",     // eure Auth-Endpunkte
  "/_next",        // Next.js internals & statics
  "/favicon.ico",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/public",
];

function isPublic(pathname: string) {
  if (PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/")))
    return true;
  // Asset-Dateien (wenn doch mal unter geschützten Pfaden)
  if (/\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|txt|map|woff2?)$/i.test(pathname))
    return true;
  return false;
}

function isApi(pathname: string) {
  return pathname.startsWith("/api/");
}

function needsAuth(pathname: string) {
  // Alles unter /settings, /terminplaner, /api braucht Login (außer /api/auth via isPublic)
  if (pathname.startsWith("/settings")) return true;
  if (pathname.startsWith("/terminplaner")) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}

// Rollenregeln: nur MASTER darf Settings (Seite + API)
function requiresMaster(pathname: string) {
  return (
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/api/settings" ||
    pathname.startsWith("/api/settings/")
  );
}

function json(status: number, msg: string) {
  return new NextResponse(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// ---- Middleware ------------------------------------------------------------

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Öffentlich immer durchlassen
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Nur prüfen, wenn Bereich Auth braucht
  if (!needsAuth(pathname)) {
    return NextResponse.next();
  }

  const session = await getSession(req);

  // Nicht eingeloggt
  if (!session) {
    if (isApi(pathname)) {
      return json(401, "Not authenticated");
    }
    const loginUrl = new URL("/login", req.url);
    // Nach Login wieder zurück
    loginUrl.searchParams.set("callbackUrl", pathname + (search || ""));
    return NextResponse.redirect(loginUrl);
  }

  // Rollenprüfung (Settings Seite + API)
  if (requiresMaster(pathname)) {
    if (session.role !== "MASTER") {
      if (isApi(pathname)) {
        return json(403, "Insufficient role");
      }
      const denied = new URL("/", req.url);
      denied.searchParams.set("error", "forbidden");
      return NextResponse.redirect(denied);
    }
  }

  return NextResponse.next();
}

// Geltungsbereich der Middleware
export const config = {
  matcher: [
    "/settings/:path*",
    "/terminplaner/:path*",
    "/api/:path*",     // Achtung: /api/auth/* fällt über PUBLIC_PREFIXES heraus
    // ggf. weitere Bereiche:
    // "/dashboard/:path*",
  ],
};
