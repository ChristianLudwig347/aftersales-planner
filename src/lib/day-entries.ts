// src/lib/day-entries.ts
import { sql } from '@vercel/postgres';

export type DayEntry = {
  id: string;
  work_day: string;    // YYYY-MM-DD
  drop_off: string | null; // HH:MM
  pick_up: string | null;  // HH:MM
  title: string | null;
  work_text: string;
  category: 'MECH' | 'BODY' | 'PREP';
  aw: number;
  created_by: string | null;
  created_at: string;
};

async function getBaseAwPerDay(): Promise<number> {
  try {
    const { rows } = await sql`SELECT base_aw_per_day FROM public.settings LIMIT 1`;
    const v = rows?.[0]?.base_aw_per_day;
    return (typeof v === 'number' && v > 0) ? v : 96;
  } catch {
    return 96;
  }
}

async function capacityForCategory(category: 'MECH' | 'BODY' | 'PREP'): Promise<number> {
  const base = await getBaseAwPerDay();
  // employees: id, category, performance
  const { rows } = await sql`
    SELECT performance FROM public.employees WHERE category = ${category}
  `;
  const cap = rows.reduce((sum, r) => sum + Math.round(base * (Number(r.performance ?? 100) / 100)), 0);
  return cap; // integer
}

export async function awUsedOnDayByCategory(workDay: string, category: 'MECH'|'BODY'|'PREP'): Promise<number> {
  const { rows } = await sql`
    SELECT COALESCE(SUM(aw), 0)::int AS used_aw
    FROM public.day_entries
    WHERE work_day = ${workDay} AND category = ${category}
  `;
  return Number(rows?.[0]?.used_aw ?? 0);
}

export async function awRemainingOnDayByCategory(workDay: string, category: 'MECH'|'BODY'|'PREP'): Promise<{capacity: number; used: number; remaining: number}> {
  const [cap, used] = await Promise.all([
    capacityForCategory(category),
    awUsedOnDayByCategory(workDay, category),
  ]);
  return { capacity: cap, used, remaining: Math.max(0, cap - used) };
}

export async function createDayEntry(input: Omit<DayEntry,'id'|'created_at'|'created_by'> & { created_by?: string|null }): Promise<DayEntry> {
  const { rows } = await sql<DayEntry>`
    INSERT INTO public.day_entries (work_day, drop_off, pick_up, title, work_text, category, aw, created_by)
    VALUES (${input.work_day}, ${input.drop_off}, ${input.pick_up}, ${input.title}, ${input.work_text}, ${input.category}, ${input.aw}, ${input.created_by ?? null})
    RETURNING *
  `;
  return rows[0];
}

export async function updateDayEntry(id: string, patch: Partial<Omit<DayEntry,'id'|'created_at'>>): Promise<DayEntry | null> {
  // dynamisch ein UPDATE bauen
  const fields: string[] = [];
  const values: any[] = [];
  const add = (col: string, val: any) => { fields.push(`${col} = $${fields.length + 1}`); values.push(val); };

  if (patch.work_day !== undefined) add('work_day', patch.work_day);
  if (patch.drop_off !== undefined) add('drop_off', patch.drop_off);
  if (patch.pick_up !== undefined) add('pick_up', patch.pick_up);
  if (patch.title !== undefined) add('title', patch.title);
  if (patch.work_text !== undefined) add('work_text', patch.work_text);
  if (patch.category !== undefined) add('category', patch.category);
  if (patch.aw !== undefined) add('aw', patch.aw);
  if (patch.created_by !== undefined) add('created_by', patch.created_by);

  if (!fields.length) {
    const { rows } = await sql<DayEntry>`SELECT * FROM public.day_entries WHERE id = ${id}`;
    return rows[0] ?? null;
  }

  const query = `
    UPDATE public.day_entries
    SET ${fields.join(', ')}
    WHERE id = $${fields.length + 1}
    RETURNING *
  `;
  const { rows } = await sql.query<DayEntry>(query, [...values, id]);
  return rows[0] ?? null;
}

export async function deleteDayEntry(id: string): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM public.day_entries WHERE id = ${id}`;
  return rowCount > 0;
}

export async function listDayEntries(from?: string, to?: string): Promise<DayEntry[]> {
  if (from && to) {
    const { rows } = await sql<DayEntry>`
      SELECT * FROM public.day_entries
      WHERE work_day BETWEEN ${from} AND ${to}
      ORDER BY work_day ASC, category ASC, created_at ASC
    `;
    return rows;
  }
  const { rows } = await sql<DayEntry>`
    SELECT * FROM public.day_entries
    ORDER BY work_day DESC, created_at DESC
    LIMIT 200
  `;
  return rows;
}

export async function dayStats(from: string, to: string) {
  // Verbräuche gruppiert
  const { rows } = await sql`
    SELECT work_day::date, category, COALESCE(SUM(aw),0)::int AS used_aw
    FROM public.day_entries
    WHERE work_day BETWEEN ${from} AND ${to}
    GROUP BY work_day, category
    ORDER BY work_day, category
  `;

  // Kapazität je Kategorie (gleich für alle Tage, solange Mitarbeiter gleich bleiben)
  const cats: Array<'MECH'|'BODY'|'PREP'> = ['MECH','BODY','PREP'];
  const caps = Object.fromEntries(await Promise.all(cats.map(async c => [c, await capacityForCategory(c)])));

  return rows.map(r => ({
    work_day: String(r.work_day),
    category: r.category as 'MECH'|'BODY'|'PREP',
    used: Number(r.used_aw),
    capacity: caps[r.category as 'MECH'|'BODY'|'PREP'] ?? 0,
    remaining: Math.max(0, (caps[r.category as 'MECH'|'BODY'|'PREP'] ?? 0) - Number(r.used_aw)),
  }));
}
