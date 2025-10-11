// src/app/api/day-entries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { z, ZodError } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EntrySchema = z.object({
  work_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  category: z.enum(["MECH", "BODY", "PREP"]),
  title: z.string().trim().min(0).max(200).nullable().optional(),
  work_text: z.string().trim().min(0).max(2000).nullable().optional(),
  drop_off: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  pick_up: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  aw: z.coerce.number().int().min(0).max(10000),
});

function j(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) return j(400, { ok: false, error: "Missing from/to" });

    // Inclusive Range, work_day ist vom Typ DATE
    const { rows } = await sql<{
      id: string;
      work_day: string;  // als 'YYYY-MM-DD'
      category: "MECH" | "BODY" | "PREP";
      title: string | null;
      work_text: string;
      drop_off: string | null;
      pick_up: string | null;
      aw: number;
    }>`
      SELECT
        id,
        to_char(work_day, 'YYYY-MM-DD') AS work_day,
        category,
        title,
        work_text,
        drop_off,
        pick_up,
        aw
      FROM day_entries
      WHERE work_day BETWEEN ${from}::date AND ${to}::date
      ORDER BY work_day ASC, created_at ASC
    `;

    return j(200, { ok: true, entries: rows });
  } catch (error: unknown) {
    return j(500, { ok: false, error: toErrorMessage(error) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EntrySchema.parse(body);

    const { rows } = await sql<{
      id: string;
      work_day: string;
      category: "MECH" | "BODY" | "PREP";
      title: string | null;
      work_text: string;
      drop_off: string | null;
      pick_up: string | null;
      aw: number;
    }>`
      INSERT INTO day_entries (work_day, category, title, work_text, drop_off, pick_up, aw)
      VALUES (
        ${parsed.work_day}::date,
        ${parsed.category},
        ${parsed.title ?? null},
        ${parsed.work_text ?? ""},
        ${parsed.drop_off ?? null},
        ${parsed.pick_up ?? null},
        ${parsed.aw}
      )
      RETURNING
        id,
        to_char(work_day, 'YYYY-MM-DD') AS work_day,
        category,
        title,
        work_text,
        drop_off,
        pick_up,
        aw
    `;

    return j(201, { ok: true, entry: rows[0] });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return j(400, { ok: false, error: "Validation failed", issues: error.issues });
    }
    return j(500, { ok: false, error: toErrorMessage(error) });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return j(400, { ok: false, error: "Missing id" });

    const { rows } = await sql<{ id: string }>`
      DELETE FROM day_entries WHERE id = ${id} RETURNING id
    `;
    if (rows.length === 0) return j(404, { ok: false, error: "Not found" });

    return j(200, { ok: true, id });
  } catch (error: unknown) {
    return j(500, { ok: false, error: toErrorMessage(error) });
  }
}
