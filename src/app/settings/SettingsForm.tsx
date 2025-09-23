'use client';

import React, { useEffect, useState } from 'react';

type Settings = {
  timezone: string;
  opening: string;
};

export default function SettingsForm() {
  const [timezone, setTimezone] = useState<string>('Europe/Berlin');
  const [opening, setOpening] = useState<string>('08:00-17:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/settings', { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: { settings?: Settings } = await r.json();
        if (!cancelled && d?.settings) {
          setTimezone(d.settings.timezone);
          setOpening(d.settings.opening);
        }
      } catch (e) {
        if (!cancelled) setError('Einstellungen konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Speichern
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ timezone, opening }),
      });
      const d: { ok?: boolean; error?: string } = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Speichern fehlgeschlagen');
    } catch (e) {
      setError('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <div>Lade Einstellungen …</div>;

  return (
    <div className="space-y-4">
      {error && <div className="text-red-600">{error}</div>}

      <div className="flex flex-col gap-2">
        <label className="font-medium">Zeitzone</label>
        <input
          className="border rounded p-2"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium">Öffnungszeiten</label>
        <input
          className="border rounded p-2"
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
          placeholder="z. B. 08:00-17:00"
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
      >
        {saving ? 'Speichere…' : 'Speichern'}
      </button>
    </div>
  );
}
