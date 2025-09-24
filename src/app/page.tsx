// src/app/page.tsx
// Kalender-Startseite mit Wochen-Navigation und serverseitigem API-Fetch

import Link from "next/link";
import { headers, cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// ---------- Helpers ----------
function toDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d));
}
function parseISO(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return toDate(y, m - 1, d);
}
function formatISO(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function startOfISOWeek(d: Date) {
  const day = d.getUTCDay(); // 0=So, 1=Mo, ... 6=Sa
  const diff = day === 0 ? -6 : 1 - day;
  const dt = new Date(d);
  dt.setUTCDate(d.getUTCDate() + diff);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}
function addDays(d: Date, days: number) {
  const dt = new Date(d);
  dt.setUTCDate(d.getUTCDate() + days);
  return dt;
}
function addWeeks(d: Date, weeks: number) {
  return addDays(d, weeks * 7);
}
function getISOWeekNumber(d: Date) {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((Number(tmp) - Number(yearStart)) / 86400000 + 1) / 7);
}
function formatWeekdayShort(d: Date) {
  const wd = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."][d.getUTCDay()];
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${wd} ${dd}.${mm}.`;
}

// ---------- URL / API ----------
function getBaseUrl() {
  const env = (process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL)?.replace(/\/$/, "");
  if (env) return env;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

// fetch-Wrapper: absolute URL + Cookies forwarden
async function apiFetch(path: string, init?: RequestInit) {
  const base = getBaseUrl();
  const url = new URL(path, base).toString();
  const cookieHeader = (await cookies()).toString();
  return fetch(url, {
    cache: "no-store",
    ...init,
    headers: { ...(init?.headers || {}), cookie: cookieHeader },
  });
}

type EmployeeCategory = "MECH" | "BODY" | "PREP";
const CATEGORY_LABEL: Record<EmployeeCategory, string> = {
  MECH: "Mechatronik",
  BODY: "Karosserie & Lack",
  PREP: "Aufbereitung",
};
const WEEK_DAYS = 5; // Mo–Fr
const BASE_AW_PER_DAY = 96;

type Employee = {
  id: string;
  name: string;
  category: EmployeeCategory;
  performance: number;
};

type DayEntry = {
  id: string;
  work_day: string; // YYYY-MM-DD
  drop_off: string | null;
  pick_up: string | null;
  title: string | null;
  work_text: string;
  category: EmployeeCategory;
  aw: number;
};

// ---------- API-Fetches ----------
async function fetchEmployees(): Promise<Employee[]> {
  const res = await apiFetch("/api/employees");
  if (!res.ok) throw new Error(`employees ${res.status}`);
  const data = await res.json();
  return data.employees ?? [];
}

async function fetchEntries(from: string, to: string): Promise<DayEntry[]> {
  const qs = new URLSearchParams({ from, to });
  const res = await apiFetch(`/api/day-entries?${qs.toString()}`);
  if (!res.ok) throw new Error(`day-entries ${res.status}`);
  const data = await res.json();
  return data.entries ?? [];
}

export default async function Page({ searchParams }: { searchParams?: { start?: string } }) {
  // 1) Woche bestimmen
  const now = new Date();
  const todayUTC = toDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startParam = searchParams?.start ? parseISO(searchParams.start) : startOfISOWeek(todayUTC);
  const weekStart = startOfISOWeek(startParam);
  const weekEnd = addDays(weekStart, WEEK_DAYS - 1);
  const prevWeek = addWeeks(weekStart, -1);
  const nextWeek = addWeeks(weekStart, 1);
  const weekNumber = getISOWeekNumber(weekStart);
  const isThisWeek = formatISO(weekStart) === formatISO(startOfISOWeek(todayUTC));

  // 2) Daten laden
  const [employees, entries] = await Promise.all([
    fetchEmployees(),
    fetchEntries(formatISO(weekStart), formatISO(weekEnd)),
  ]);

  // 3) Kapazität pro Rubrik
  const capacityByCat: Record<EmployeeCategory, number> = { MECH: 0, BODY: 0, PREP: 0 };
  for (const e of employees) {
    const aw = Math.round((BASE_AW_PER_DAY * (e.performance || 100)) / 100);
    capacityByCat[e.category] += aw;
  }
  const totalCapacityPerDay =
    (capacityByCat.MECH ?? 0) + (capacityByCat.BODY ?? 0) + (capacityByCat.PREP ?? 0);

  // 4) Tage der Woche, Einträge mappen
  const days = Array.from({ length: WEEK_DAYS }, (_, i) => addDays(weekStart, i));
  const entriesByKey = new Map<string, DayEntry[]>();
  const usedAwByKey = new Map<string, number>();
  const usedAwByDay = new Map<string, number>(); // für Prozent-Badge oben

  for (const entry of entries) {
    const key = `${entry.work_day}__${entry.category}`;
    (entriesByKey.get(key) ?? entriesByKey.set(key, []).get(key)!)?.push(entry);

    const usedCell = usedAwByKey.get(key) ?? 0;
    usedAwByKey.set(key, usedCell + (entry.aw || 0));

    const usedDay = usedAwByDay.get(entry.work_day) ?? 0;
    usedAwByDay.set(entry.work_day, usedDay + (entry.aw || 0));
  }

  // Helper: Badge-Styles je nach freien Prozent
  function pctBadge(freePct: number | null) {
    if (freePct === null) {
      return (
        <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-800">
          —%
        </span>
      );
    }
    const cls =
      freePct >= 40
        ? "bg-green-100 text-green-800"
        : freePct >= 15
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
    return (
      <span
        className={
          "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
          cls
        }
        title="freie Kapazität (in %)"
      >
        {freePct}%
      </span>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      {/* Kopf mit Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Aftersales Planner</h1>
        <div className="flex items-center gap-2">
          <Link href={`/?start=${formatISO(prevWeek)}`}>
            <Button variant="outline">← Vorherige</Button>
          </Link>
          <Link href={isThisWeek ? "#" : "/"}>
            <Button variant="secondary" disabled={isThisWeek}>
              Heute
            </Button>
          </Link>
          <Link href={`/?start=${formatISO(nextWeek)}`}>
            <Button variant="outline">Nächste →</Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline">Einstellungen</Button>
          </Link>
        </div>
      </div>

      <div className="mb-2 text-lg font-medium">Woche {weekNumber}</div>

      {/* Tabellen-Grid */}
      <div className="grid grid-cols-[200px_repeat(5,1fr)] gap-2 rounded-2xl border">
        <div className="p-3 font-medium">Rubrik</div>
        {days.map((d, i) => {
          const iso = formatISO(d);
          const used = usedAwByDay.get(iso) ?? 0;
          const free = Math.max(0, totalCapacityPerDay - used);
          const freePct =
            totalCapacityPerDay > 0 ? Math.round((free / totalCapacityPerDay) * 100) : null;
          return (
            <div key={i} className="p-3 font-medium border-l">
              {formatWeekdayShort(d)}
              {/* Prozent-Ampel */}
              {pctBadge(freePct)}
            </div>
          );
        })}

        {(Object.keys(CATEGORY_LABEL) as EmployeeCategory[]).map((cat) => (
          <div key={cat} className="contents">
            <div className="p-3 border-t font-medium">{CATEGORY_LABEL[cat]}</div>

            {days.map((d, i) => {
              const workDay = formatISO(d);
              const key = `${workDay}__${cat}`;
              const cap = capacityByCat[cat] ?? 0;
              const used = usedAwByKey.get(key) ?? 0;
              const free = Math.max(0, cap - used);
              const cellEntries = entriesByKey.get(key) ?? [];

              return (
                <div key={i} className="p-3 border-t border-l">
                  <div className="mb-2">
                    <Badge variant="secondary">
                      frei: <span className="ml-1 font-semibold">{free} AW</span>
                      <span className="ml-1 text-muted-foreground">
                        ({used}/{cap})
                      </span>
                    </Badge>
                  </div>

                  {cap === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Keine Mitarbeiter in dieser Rubrik angelegt.
                    </div>
                  ) : cellEntries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Keine Einträge.</div>
                  ) : (
                    <ul className="space-y-1">
                      {cellEntries.map((e) => (
                        <li key={e.id} className="text-sm">
                          <span className="font-medium">{e.title || "—"}</span> · {e.aw} AW
                          {e.drop_off && e.pick_up && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {e.drop_off}–{e.pick_up}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
