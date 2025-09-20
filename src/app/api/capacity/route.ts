// src/app/api/capacity/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listEmployees } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE_MINUTES_PER_DAY = 8 * 60; // 480
const BASE_AW_PER_DAY = 96;

function capFromPerformance(pct: number) {
  const minutes = Math.round((BASE_MINUTES_PER_DAY * (pct || 100)) / 100);
  const aw = Math.round((BASE_AW_PER_DAY * (pct || 100)) / 100);
  return { minutes, aw };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("start"); // YYYY-MM-DD
    const daysParam = Number(searchParams.get("days") || 5);

    const start = startParam ? new Date(`${startParam}T00:00:00`) : new Date();
    start.setHours(0, 0, 0, 0);

    const employees = await listEmployees();
    const CATS = ["MECH", "BODY", "PREP"] as const;

    const days = Array.from({ length: daysParam }).map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const date = d.toISOString().slice(0, 10);
      const categories: Record<(typeof CATS)[number], { minutes: number; aw: number }> = {
        MECH: { minutes: 0, aw: 0 },
        BODY: { minutes: 0, aw: 0 },
        PREP: { minutes: 0, aw: 0 },
      };
      for (const e of employees) {
        const cap = capFromPerformance(e.performance);
        categories[e.category].minutes += cap.minutes;
        categories[e.category].aw += cap.aw;
      }
      return { date, categories };
    });

    return NextResponse.json({ ok: true, days });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
