// src/app/login/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';

  const [email, setEmail] = useState('christian.ludwig@auto-eckhardt.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        cache: 'no-store',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      // ✅ Cookie ist gesetzt → Server Components (Layout) sofort neu rendern
      router.replace(next);
      router.refresh();
    } catch (error: unknown) {
      setError(toErrorMessage(error) ?? 'Login fehlgeschlagen');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Login</h1>
      {error && <div className="text-red-600">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-col gap-2">
          <label className="font-medium">E-Mail</label>
          <input
            className="border rounded p-2"
            placeholder="E-Mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">Passwort</label>
          <input
            className="border rounded p-2"
            placeholder="Passwort"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {pending ? 'Anmelden…' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}
