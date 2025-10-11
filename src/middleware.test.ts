// src/middleware.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { middleware } from "./middleware";
import type { NextRequest } from "next/server";

// --- jose mocken ------------------------------------------------------------
vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));
import { jwtVerify } from "jose";
const mockedJwtVerify = vi.mocked(jwtVerify);

// --- Helper zum Request-Bauen -----------------------------------------------
function mkReq(pathname: string, cookieValue?: string): NextRequest {
  const url = `http://localhost${pathname}`;
  const nextUrl = new URL(url);

  const req = {
    nextUrl: {
      pathname: nextUrl.pathname,
      search: nextUrl.search,
    },
    url,
    cookies: {
      get: (name: string) =>
        name === "ae.session" && cookieValue
          ? { name, value: cookieValue }
          : undefined,
    },
  } as unknown as NextRequest;

  return req;
}

// --- Tests ------------------------------------------------------------------
describe("middleware", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("public route: /api/auth/login → Next", async () => {
    const req = mkReq("/api/auth/login");
    const res = await middleware(req);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("unauthenticated /settings → Redirect zu /login?callbackUrl=%2Fsettings", async () => {
    const req = mkReq("/settings");
    const res = await middleware(req);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = res.headers.get("location")!;
    expect(loc).toMatch(/^http:\/\/localhost\/login\?/);
    expect(loc).toContain("callbackUrl=%2Fsettings");
  });

  it("unauthenticated /api/settings → 401 JSON", async () => {
    const req = mkReq("/api/settings");
    const res = await middleware(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Not authenticated" });
  });

  it("authenticated USER auf /settings → Redirect /?error=forbidden & 403 für API", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { userId: "u1", email: "u@e", role: "USER" },
    });

    const reqPage = mkReq("/settings", "dummy");
    const resPage = await middleware(reqPage);
    expect(resPage.status).toBeGreaterThanOrEqual(300);
    expect(resPage.status).toBeLessThan(400);
    expect(resPage.headers.get("location")).toMatch(
      /^http:\/\/localhost\/\?error=forbidden$/
    );

    const reqApi = mkReq("/api/settings", "dummy");
    const resApi = await middleware(reqApi);
    expect(resApi.status).toBe(403);
    const body = await resApi.json();
    expect(body).toEqual({ error: "Insufficient role" });
  });

  it("authenticated MASTER auf /settings → Next", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { userId: "u1", email: "u@e", role: "MASTER" },
    });

    const req = mkReq("/settings", "dummy");
    const res = await middleware(req);
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.status).toBe(200);
  });

  it("authenticated USER auf /terminplaner → Next (nur Login nötig)", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { userId: "u1", email: "u@e", role: "USER" },
    });
    const req = mkReq("/terminplaner", "dummy");
    const res = await middleware(req);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
