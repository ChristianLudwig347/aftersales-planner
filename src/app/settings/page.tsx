// app/settings/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "MASTER") redirect("/");
  return <SettingsForm />;
}
