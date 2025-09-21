'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// falls du shadcn/ui nutzt:
import { Button } from '@/components/ui/button';

export default function LogoutButton({
  label = 'Abmelden',
  confirm = false,
}: { label?: string; confirm?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    if (confirm && !window.confirm('Wirklich abmelden?')) return;

    try {
      setLoading(true);
      // API: DELETE /api/auth/login – löscht das ae.session-Cookie
      const res = await fetch('/api/auth/login', { method: 'DELETE' });
      // optional: Fehlerbehandlung
      if (!res.ok) console.warn('Logout response not ok:', await res.text());
      router.push('/login');
    } catch (e) {
      console.error(e);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  // Falls du kein shadcn/ui hast, ersetze <Button> durch <button>
  return (
    <Button onClick={onLogout} disabled={loading} variant="outline">
      {loading ? '…' : label}
    </Button>
  );
}
