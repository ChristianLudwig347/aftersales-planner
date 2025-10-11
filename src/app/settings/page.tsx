// src/app/settings/page.tsx
import { headers, cookies } from "next/headers";
import SettingsForm from "./SettingsForm";

type Opening = Record<string, unknown>;
type SettingsRow = { timezone: string; opening: Opening | null };

const DEFAULT_OPENING: Opening = {
  mon: [{ start: "08:00", end: "17:00" }],
  tue: [{ start: "08:00", end: "17:00" }],
  wed: [{ start: "08:00", end: "17:00" }],
  thu: [{ start: "08:00", end: "17:00" }],
  fri: [{ start: "08:00", end: "16:00" }],
  sat: [{ start: "08:00", end: "12:00" }],
  sun: [],
  holidays: [],
};

// >>> make async
async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

// >>> await baseUrl() & cookies()
async function api<T>(path: string): Promise<T> {
  const url = new URL(path, await baseUrl()).toString();
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(url, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let s: SettingsRow | null = null;
  try {
    const data = await api<{ ok: boolean; settings: SettingsRow | null }>(
      "/api/settings"
    );
    s = data?.settings ?? null;
  } catch {
    // Defaults verwenden
  }

  const initial = {
    timezone: s?.timezone ?? "Europe/Berlin",
    opening: s?.opening ?? DEFAULT_OPENING,
  };

  return <SettingsForm initial={initial} />;
}
