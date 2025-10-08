// src/app/page.tsx
// Kalender-Startseite mit Wochen-Navigation und serverseitigem API-Fetch

import Link from "next/link";
import { headers, cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddEntryModal from "@/components/AddEntryModal";

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

// Farb- und Breitenlogik für Auslastungsbalken
function utilizationColorClass(util: number) {
  // util = verwendete AW / Kapazität (>= 0, kann >1 sein)
  if (util <= 0.8) return "bg-green-500";   // viel Puffer
  if (util <= 1.0) return "bg-green-600";   // gut ausgelastet
  if (util <= 1.2) return "bg-amber-500";   // leicht überbucht
  return "bg-red-600";                      // stark überbucht
}
function clampBarWidth(util: number) {
  // Bis 150% visualisieren, darüber deckeln
  const pct = Math.min(util, 1.5) * 100;
  return `${pct}%`;
}
// Zeit-Helper für Sortierung der Termine
function timeToMinutes(t: string | null) {
  if (!t) return 24 * 60 + 1;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ---------- URL / API ----------
function getBaseUrl() {
  const env = (process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL)?.replace(/\/$/, "");
  if (env) return env;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
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

// ---------- Hauptkomponente ----------
export default async function Page({
  searchParams,
}: {
  searchParams?: { start?: string };
}) {
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

  // 4) Tage/Eingaben mappen
  const days = Array.from({ length: WEEK_DAYS }, (_, i) => addDays(weekStart, i));
  const entriesByKey = new Map<string, DayEntry[]>();
  const usedAwByKey = new Map<string, number>();
  const entriesByDay = new Map<string, DayEntry[]>(); // für Termine-Sidebar

  for (const entry of entries) {
    const key = `${entry.work_day}__${entry.category}`;
    (entriesByKey.get(key) ?? entriesByKey.set(key, []).get(key)!)?.push(entry);

    const usedCell = usedAwByKey.get(key) ?? 0;
    usedAwByKey.set(key, usedCell + (entry.aw || 0));

    // für Termine-Sidebar: alle Einträge des Tages sammeln
    (entriesByDay.get(entry.work_day) ??
      entriesByDay.set(entry.work_day, []).get(entry.work_day)!)?.push(entry);
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      {/* LINKER REITER + SIDEBAR (ohne JS, via peer-checked) */}
      <div className="fixed inset-y-0 left-0 z-50">
        {/* Toggle */}
        <input id="termine-toggle" type="checkbox" className="peer hidden" />

        {/* Reiter / Tab, ragt links rein */}
        <label
          htmlFor="termine-toggle"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer rounded-r-xl bg-primary px-3 py-2 text-primary-foreground shadow-lg hover:brightness-105"
          title="Termine anzeigen"
        >
          Termine
        </label>

        {/* Slide-over Panel */}
        <div className="pointer-events-auto fixed left-0 top-0 h-screen w-[320px] -translate-x-full transform bg-white shadow-xl transition-all duration-300 ease-in-out dark:bg-neutral-900 peer-checked:translate-x-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="font-semibold">Termine – Woche {weekNumber}</div>
            {/* Close */}
            <label
              htmlFor="termine-toggle"
              className="cursor-pointer rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-gray-100 dark:hover:bg-neutral-800"
              title="Schließen"
            >
              Schließen
            </label>
          </div>

          {/* Inhalt: Termine nach Tag */}
          <div className="h-[calc(100vh-52px)] overflow-y-auto px-4 py-3">
            {days.map((d, idx) => {
              const workDay = formatISO(d);
              const appts =
                (entriesByDay.get(workDay) ?? [])
                  .filter((e) => e.drop_off || e.pick_up)
                  .sort((a, b) => timeToMinutes(a.drop_off) - timeToMinutes(b.drop_off));

              return (
                <div key={idx} className="mb-5">
                  <div className="mb-2 text-sm font-medium text-muted-foreground">
                    {formatWeekdayShort(d)}
                  </div>
                  {appts.length === 0 ? (
                    <div className="text-sm text-muted-foreground">keine Termine</div>
                  ) : (
                    <ul className="space-y-1">
                      {appts.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center justify-between rounded-lg border px-2 py-1 text-sm"
                        >
                          <span className="tabular-nums">
                            {e.drop_off ?? "—"}
                            {e.pick_up ? `–${e.pick_up}` : ""}
                          </span>
                          <span className="ml-2 truncate pl-2">
                            {e.title || e.work_text || "Auftrag"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

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

      {/* Wochen-Rahmen + Grid-Trennlinien */}
      <div className="rounded-2xl border overflow-hidden">
        <div
          className={`grid grid-cols-[200px_repeat(${WEEK_DAYS},1fr)] divide-x divide-y divide-gray-200 dark:divide-neutral-800`}
        >
          {/* Kopfzeile: Rubrik + Tage */}
          <div className="p-3 font-medium">Rubrik</div>
          {days.map((d, i) => {
            const iso = formatISO(d);
            return (
              <div key={i} className="p-3 font-medium">
                <div className="flex items-center justify-between">
                  <span>{formatWeekdayShort(d)}</span>
                </div>

                {/* Auslastung je Rubrik (Balken) */}
                <div className="mt-2 space-y-2 text-xs">
                  {(Object.keys(CATEGORY_LABEL) as EmployeeCategory[]).map((cat) => {
                    const cap = capacityByCat[cat] ?? 0;
                    const usedCat = usedAwByKey.get(`${iso}__${cat}`) ?? 0;

                    const util = cap > 0 ? usedCat / cap : 0; // 0..n
                    const barClass = utilizationColorClass(util);
                    const barWidth = clampBarWidth(util);

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between tabular-nums">
                          <span className="text-black/80 dark:text-white/80">
                            {CATEGORY_LABEL[cat]}
                          </span>
                          <span className="text-muted-foreground">
                            {usedCat}/{cap} AW
                          </span>
                        </div>

                        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                          <div className={`h-1.5 ${barClass}`} style={{ width: barWidth }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Rubrik-Zeilen + Tageszellen */}
          {(Object.keys(CATEGORY_LABEL) as EmployeeCategory[]).map((cat) => (
            <div key={cat} className="contents">
              <div className="p-3 font-medium">{CATEGORY_LABEL[cat]}</div>

              {days.map((d, i) => {
                const workDay = formatISO(d);
                const key = `${workDay}__${cat}`;
                const cap = capacityByCat[cat] ?? 0;
                const used = usedAwByKey.get(key) ?? 0;

                // Utilization für farbigen Balken in der Zelle (0..n)
                const utilCell = cap > 0 ? used / cap : 0;
                const barClassCell = utilizationColorClass(utilCell);
                const barWidthCell = clampBarWidth(utilCell);

                // Delta statt clampen – zeigt Überplanung deutlich an
                const delta = cap - used; // >0 = frei, <0 = überplant
                const freeAw = Math.max(0, delta);
                const overAw = Math.max(0, -delta);

                const cellEntries = entriesByKey.get(key) ?? [];

                return (
                  <div key={i} className="p-3">
                    {/* Kopf der Zelle: Kapazität + Quick-Add */}
                    <div className="mb-2 flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={delta < 0 ? "bg-red-600 text-white" : ""}
                        title={delta < 0 ? "Überplanung in AW" : "Freie AW"}
                      >
                        {delta >= 0 ? (
                          <>
                            frei: <span className="ml-1 font-semibold">{freeAw} AW</span>
                            <span className="ml-1 text-muted-foreground">
                              ({used}/{cap})
                            </span>
                          </>
                        ) : (
                          <>
                            überplant: <span className="ml-1 font-semibold">{overAw} AW</span>
                            <span className="ml-1 text-white/80">
                              ({used}/{cap})
                            </span>
                          </>
                        )}
                      </Badge>
                      <AddEntryModal workDay={workDay} category={cat} />
                    </div>

                    {/* Auslastungs-Balken in der Zelle */}
                    <div className="mb-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                      <div className={`h-1.5 ${barClassCell}`} style={{ width: barWidthCell }} />
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
    </div>
  );
}
