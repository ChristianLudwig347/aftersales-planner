// src/lib/db.ts
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR =
  process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "employees.json");

export async function loadEmployees(): Promise<any[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const buf = await fs.readFile(FILE, "utf-8");
    return JSON.parse(buf);
  } catch {
    return [];
  }
}

export async function saveEmployees(list: any[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2), "utf-8");
}
