// src/lib/db.ts
import { sql } from "@vercel/postgres";

/** Einmalig Tabelle anlegen, falls noch nicht vorhanden */
export async function ensureEmployeesTable() {
  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS employees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      performance INTEGER NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('MECH','BODY','PREP')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
}

/** Datentyp als Referenz in Frontend */
export type EmployeeRow = {
  id: string;
  name: string;
  performance: number; // 50..150
  category: "MECH" | "BODY" | "PREP";
  created_at: string;
};
