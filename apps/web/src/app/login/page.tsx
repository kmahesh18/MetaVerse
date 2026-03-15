'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Navbar } from '@/components/layout/Navbar';
import { OfficeLottie } from '@/components/retro/OfficeLottie';
import { GuestGuard } from '@/components/GuestGuard';

function LoginContent() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="retro-shell min-h-screen text-foreground">
      <Navbar />
      <div className="mx-auto grid min-h-screen w-full items-center gap-8 px-6 pb-12 pt-24 sm:px-10 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="retro-panel hidden p-6 lg:block">
          <p className="retro-display text-[11px] text-foreground/60">Office Pulse</p>
          <OfficeLottie className="mt-3 h-[32rem] w-full rounded-[var(--radius)] bg-background/50 p-4" />
        </div>

        <div className="retro-panel w-full p-8">
          <div className="mb-6">
            <p className="retro-display text-[11px] text-foreground/60">Welcome Back</p>
            <h1 className="mt-3 text-3xl font-semibold">Sign in to your workspace</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Jump back into your rooms, people, and active sessions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="retro-button w-full rounded-full py-3 font-medium disabled:opacity-45"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-foreground hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <GuestGuard>
      <LoginContent />
    </GuestGuard>
  );
}
