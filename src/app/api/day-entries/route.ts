// src/app/api/day-entries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { sql } from "@vercel/postgres";
import { getSession } from "@/lib/auth"; // du hast das bereits für /settings genutzt

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// --- Zod-Schema für Validierung ---
const DayEntrySchema = z.object({
  work_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  drop_off: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  pick_up: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  work_text: z.string().max(4000).nullable().optional(),
  category: z.enum(["MECH", "BODY", "PREP"]),
  aw: z.number().int().min(0),
});

// ---------- GET: Liste für Zeitraum ----------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) {
      return NextResponse.json(
        { ok: false, error: "Missing from/to" },
        { status: 400 }
      );
    }

    const { rows } = await sql/*sql*/`
      SELECT id, work_day, drop_off, pick_up, title, work_text, category, aw, created_by, created_at
      FROM public.day_entries
      WHERE work_day BETWEEN ${from} AND ${to}
      ORDER BY work_day, drop_off NULLS FIRST, pick_up NULLS FIRST, created_at;
    `;
    return NextResponse.json({ ok: true, items: rows });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

// ---------- POST: Eintrag anlegen (nur MASTER) ----------
export async function POST(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s || s.role !== "MASTER") {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const raw = await req.json();
    const data = DayEntrySchema.parse({
      ...raw,
      // Normalisiere leere Strings zu null für optionale Textfelder
      title: raw?.title ? String(raw.title) : null,
      work_text: raw?.work_text ? String(raw.work_text) : null,
      drop_off: raw?.drop_off ? String(raw.drop_off) : null,
      pick_up: raw?.pick_up ? String(raw.pick_up) : null,
    });

    // Kein sql.begin -> einfacher Insert
    const { rows } = await sql/*sql*/`
      INSERT INTO public.day_entries
        (work_day, drop_off, pick_up, title, work_text, category, aw, created_by)
      VALUES
        (${data.work_day},
         ${data.drop_off},
         ${data.pick_up},
         ${data.title},
         ${data.work_text},
         ${data.category},
         ${data.aw},
         ${s.userId})
      RETURNING id, work_day, drop_off, pick_up, title, work_text, category, aw, created_by, created_at;
    `;

    return NextResponse.json({ ok: true, entry: rows[0] }, { status: 201 });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

// ---------- DELETE: Eintrag löschen (nur MASTER) ----------
export async function DELETE(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s || s.role !== "MASTER") {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    await sql/*sql*/`DELETE FROM public.day_entries WHERE id = ${id};`;
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
