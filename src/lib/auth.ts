// src/lib/auth.ts
import { cookies } from "next/headers";
import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt);

// =========================================
// Konfiguration
// =========================================
export const SESSION_COOKIE = "ae.session";
const JWT_ALG = "HS256" as const;

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me"
);
const DEFAULT_SESSION_TTL = "7d"; // z.B. '7d', '24h', '3600s'

// Default-Cookie-Flags (kannst du bei Bedarf überschreiben)
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  // maxAge setzt setSessionCookie dynamisch
};

// =========================================
// Typen
// =========================================
export type Session = JWTPayload & {
  userId: string;
  email: string;
  role: "MASTER" | "USER";
};

// =========================================
// Password-Utils (Node scrypt)
// =========================================
/** Passwort sicher hashen (Node scrypt, kein Extra-Package nötig). */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(plain, salt, 64)) as Buffer;
  // Format: scrypt$<hex-salt>$<hex-hash>
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

/** Passwort mit gespeichertem Hash vergleichen. */
export async function comparePassword(
  plain: string,
  stored: string
): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const key = (await scrypt(plain, salt, 64)) as Buffer;

  // timing-safe Vergleich
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// =========================================
// JWT-Session
// =========================================
/** Neues JWT für eine Session signieren. */
export async function signSession(
  payload: Pick<Session, "userId" | "email" | "role">,
  opts?: { expiresIn?: string | number }
): Promise<string> {
  return await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: JWT_ALG, typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(opts?.expiresIn ?? DEFAULT_SESSION_TTL)
    .sign(JWT_SECRET);
}

/** JWT prüfen und Session zurückgeben (oder null). */
export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: [JWT_ALG],
      clockTolerance: 5, // 5s Toleranz gegen Clock Skew
    });
    return payload as Session;
  } catch {
    return null;
  }
}

/** Session aus dem Next.js Cookies-Store lesen. (Next 15: cookies() awaiten!) */
export async function getSession(): Promise<Session | null> {
  const store = await cookies(); // <— WICHTIG
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySession(token);
}

/** Helper: wirf bei fehlender Auth einen Fehler (für API-Routen nützlich). */
export async function requireAuth(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

/** Helper: nur MASTER-Rolle zulassen. */
export async function requireMaster(): Promise<Session> {
  const s = await requireAuth();
  if (s.role !== "MASTER") throw new Error("FORBIDDEN");
  return s;
}

// =========================================
// Cookie Helper (setzen/löschen)
// =========================================
/** Session-Cookie setzen (z. B. nach Login). */
export async function setSessionCookie(
  token: string,
  maxAgeSeconds = 60 * 60 * 24 * 7 // 7 Tage
) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    ...sessionCookieOptions,
    maxAge: maxAgeSeconds,
  });
}

/** Session-Cookie löschen (z. B. beim Logout). */
export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
