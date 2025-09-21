// src/lib/availability.ts
import { sql } from "@vercel/postgres";

export type EmployeeCategory = "MECH" | "BODY" | "PREP";

export const BASE_AW_PER_DAY = 96;

/**
 * Kapazität (AW/Tag) je Rubrik aus employees.performance
 * performance 100 = 96 AW/Tag; 50 = 48 AW/Tag; etc.
 */
export async function getCapacityPerCategory(): Promise<Record<EmployeeCategory, number>> {
  const { rows } = await sql/*sql*/`
    SELECT category, SUM(performance)::int AS perf_sum
    FROM public.employees
    GROUP BY category;
  `;

  const out: Record<EmployeeCategory, number> = { MECH: 0, BODY: 0, PREP: 0 };
  for (const r of rows as { category: EmployeeCategory; perf_sum: number }[]) {
    const cap = Math.round((BASE_AW_PER_DAY * (r.perf_sum ?? 0)) / 100);
    out[r.category] = cap;
  }
  return out;
}

/**
 * Verwendete AW aus day_entries je Tag & Rubrik im Zeitraum.
 */
export async function getUsedAwByDayCategory(
  fromISO: string,
  toISO: string
): Promise<Record<string, Record<EmployeeCategory, number>>> {
  const { rows } = await sql/*sql*/`
    SELECT work_day::date AS day,
           category,
           COALESCE(SUM(aw), 0)::int AS used
    FROM public.day_entries
    WHERE work_day BETWEEN ${fromISO} AND ${toISO}
    GROUP BY work_day, category
    ORDER BY work_day, category;
  `;

  const map: Record<string, Record<EmployeeCategory, number>> = {};
  for (const r of rows as { day: string; category: EmployeeCategory; used: number }[]) {
    if (!map[r.day]) map[r.day] = { MECH: 0, BODY: 0, PREP: 0 };
    map[r.day][r.category] = r.used ?? 0;
  }
  return map;
}

/**
 * erstellt alle ISO-Daten (YYYY-MM-DD) zwischen from..to (inkl.)
 */
function isoRange(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const from = new Date(fromISO);
  const to = new Date(toISO);
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const s = d.toISOString().slice(0, 10);
    out.push(s);
  }
  return out;
}

/**
 * Liefert je Tag und Kategorie: capacity, used, free
 */
export async function getDailyFreeAw(
  fromISO: string,
  toISO: string
): Promise<Record<string, Record<EmployeeCategory, { capacity: number; used: number; free: number }>>> {
  const capacity = await getCapacityPerCategory();
  const usedMap = await getUsedAwByDayCategory(fromISO, toISO);

  const result: Record<
    string,
    Record<EmployeeCategory, { capacity: number; used: number; free: number }>
  > = {};

  for (const day of isoRange(fromISO, toISO)) {
    const usedForDay = usedMap[day] ?? { MECH: 0, BODY: 0, PREP: 0 };
    result[day] = {
      MECH: {
        capacity: capacity.MECH,
        used: usedForDay.MECH,
        free: Math.max(capacity.MECH - usedForDay.MECH, 0),
      },
      BODY: {
        capacity: capacity.BODY,
        used: usedForDay.BODY,
        free: Math.max(capacity.BODY - usedForDay.BODY, 0),
      },
      PREP: {
        capacity: capacity.PREP,
        used: usedForDay.PREP,
        free: Math.max(capacity.PREP - usedForDay.PREP, 0),
      },
    };
  }

  return result;
}
