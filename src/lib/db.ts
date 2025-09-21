// src/lib/db.ts
import { sql } from '@vercel/postgres';

/** Typen */
export type DayCategory = 'MECH' | 'BODY' | 'PREP';

export type DayEntry = {
  id: string;
  work_day: string;            // YYYY-MM-DD
  drop_off: string | null;     // HH:MM
  pick_up: string | null;      // HH:MM
  title: string | null;
  work_text: string;
  category: DayCategory;
  aw: number;
  created_by: string | null;
  created_at: string;
};

export type DaySummaryRow = {
  category: DayCategory;
  capacity_aw: number;
  used_aw: number;
  remaining_aw: number;
};

/** interner Helper: AW/Tag Basis (settings.aw_per_day, fallback 96) */
async function getBaseAwPerDay(tx = sql) {
  const r = await tx`
    SELECT COALESCE(
      (SELECT aw_per_day FROM settings LIMIT 1),
      96
    )::int AS aw_per_day
  `;
  return Number(r.rows[0].aw_per_day);
}

/** Tagesbilanz je Rubrik (Capacity/Used/Remaining) */
export async function getDaySummary(dateISO: string): Promise<DaySummaryRow[]> {
  const base = await getBaseAwPerDay();
  const res = await sql<DaySummaryRow>`
    WITH cap AS (
      SELECT e.category::text AS category,
             SUM(ROUND(${base} * (e.performance::numeric / 100)))::int AS capacity_aw
      FROM employees e
      GROUP BY e.category
    ),
    used AS (
      SELECT category::text AS category, COALESCE(SUM(aw),0)::int AS used_aw
      FROM day_entries
      WHERE work_day = ${dateISO}
      GROUP BY category
    )
    SELECT c.category::text AS category,
           COALESCE(c.capacity_aw, 0)::int AS capacity_aw,
           COALESCE(u.used_aw, 0)::int AS used_aw,
           (COALESCE(c.capacity_aw, 0) - COALESCE(u.used_aw, 0))::int AS remaining_aw
    FROM cap c
    LEFT JOIN used u ON u.category = c.category
    ORDER BY c.category;
  `;
  return res.rows.map(r => ({
    category: r.category as DayCategory,
    capacity_aw: Number(r.capacity_aw ?? 0),
    used_aw: Number(r.used_aw ?? 0),
    remaining_aw: Number(r.remaining_aw ?? 0),
  }));
}

/** Tagesbilanz für eine Rubrik (für POST-Check) */
export async function getRemainingFor(dateISO: string, category: DayCategory, tx = sql): Promise<number> {
  const base = await getBaseAwPerDay(tx);
  const r = await tx<{ remaining_aw: number }>`
    WITH cap AS (
      SELECT SUM(ROUND(${base} * (e.performance::numeric / 100)))::int AS capacity_aw
      FROM employees e
      WHERE e.category = ${category}
    ),
    used AS (
      SELECT COALESCE(SUM(aw),0)::int AS used_aw
      FROM day_entries
      WHERE work_day = ${dateISO} AND category = ${category}
    )
    SELECT (COALESCE(cap.capacity_aw,0) - COALESCE(used.used_aw,0))::int AS remaining_aw
    FROM cap, used;
  `;
  return Number(r.rows[0]?.remaining_aw ?? 0);
}

/** Eintrag anlegen (mit Transaktion & AW-Prüfung) */
export async function createDayEntry(input: {
  work_day: string;
  drop_off?: string | null;
  pick_up?: string | null;
  title?: string | null;
  work_text: string;
  category: DayCategory;
  aw: number;
  created_by?: string | null;
}) {
  return await sql.begin(async (tx) => {
    const remaining = await getRemainingFor(input.work_day, input.category, tx);
    if (remaining < input.aw) {
      const err: any = new Error('INSUFFICIENT_CAPACITY');
      err.code = 'INSUFFICIENT_CAPACITY';
      err.details = { remaining, requested: input.aw };
      throw err;
    }

    const ins = await tx<DayEntry>`
      INSERT INTO day_entries (work_day, drop_off, pick_up, title, work_text, category, aw, created_by)
      VALUES (
        ${input.work_day},
        ${input.drop_off ?? null},
        ${input.pick_up ?? null},
        ${input.title ?? null},
        ${input.work_text},
        ${input.category},
        ${input.aw},
        ${input.created_by ?? null}
      )
      RETURNING id, work_day, drop_off, pick_up, title, work_text, category, aw, created_by, created_at;
    `;

    const summary = await getDaySummary(input.work_day);
    return { entry: ins.rows[0], summary };
  });
}

/** Liste der Einträge im Bereich */
export async function listDayEntries(fromISO: string, toISO: string) {
  const r = await sql<DayEntry>`
    SELECT id, work_day, drop_off, pick_up, title, work_text, category, aw, created_by, created_at
    FROM day_entries
    WHERE work_day BETWEEN ${fromISO} AND ${toISO}
    ORDER BY work_day ASC, category ASC, created_at ASC;
  `;
  return r.rows;
}
