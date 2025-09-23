"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteEmployeeButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const ok = confirm("Mitarbeiter wirklich löschen?");
          if (!ok) return;
          const res = await fetch(`/api/employees?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert(`Löschen fehlgeschlagen: ${j?.error ?? res.status}`);
            return;
          }
          router.refresh();
        })
      }
    >
      {pending ? "Lösche…" : "Löschen"}
    </Button>
  );
}
