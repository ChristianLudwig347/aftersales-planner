"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    router.replace("/");
    router.refresh(); // ⬅️ Session im Layout sofort aktualisieren
  }

  return (
    <button
      type="button"
      onClick={() => start(handleLogout)}
      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 transition disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Abmelden…" : "Abmelden"}
    </button>
  );
}
