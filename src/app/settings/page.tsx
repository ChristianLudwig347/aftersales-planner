// src/app/settings/page.tsx
import { headers, cookies } from "next/headers";
import SettingsForm from "./SettingsForm"; // <-- exakt so (Groß-/Kleinschreibung!)

type Opening = Record<string, any>;
type SettingsRow = { timezone: string; opening: Opening | null };

function baseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}
async function api<T>(path: string): Promise<T> {
  const res = await fetch(new URL(path, baseUrl()), {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await api<{ ok: boolean; settings: SettingsRow | null }>("/api/settings");
  const settings = data.settings ?? {
    timezone: "Europe/Berlin",
    opening: {
      mon: [{ start: "08:00", end: "17:00" }],
      tue: [{ start: "08:00", end: "17:00" }],
      wed: [{ start: "08:00", end: "17:00" }],
      thu: [{ start: "08:00", end: "17:00" }],
      fri: [{ start: "08:00", end: "16:00" }],
    },
  };

  return <SettingsForm initial={settings} />;
}
