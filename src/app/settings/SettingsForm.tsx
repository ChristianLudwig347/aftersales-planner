// Laden
useEffect(() => {
  (async () => {
    const r = await fetch("/api/settings", { cache: "no-store" });
    const d = await r.json();
    if (d?.settings) {
      setTimezone(d.settings.timezone);
      setOpening(d.settings.opening);
    }
  })();
}, []);

// Speichern
async function save() {
  const r = await fetch("/api/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ timezone, opening }),
  });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error ?? "Speichern fehlgeschlagen");
}
