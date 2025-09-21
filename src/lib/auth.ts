// lib/auth.ts
import { cookies } from "next/headers";
import { jwtVerify, JWTPayload } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export type Session = JWTPayload & {
  userId: string;
  email: string;
  role: "MASTER" | "USER";
};

async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get("ae.session")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function requireAuth(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export async function requireMaster(): Promise<Session> {
  const s = await requireAuth();
  if (s.role !== "MASTER") throw new Error("FORBIDDEN");
  return s;
}
