'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Navbar } from '@/components/layout/Navbar';
import { OfficeLottie } from '@/components/retro/OfficeLottie';

const CHARACTERS = [
  { name: 'Adam', file: 'adam_idle.png' },
  { name: 'Alex', file: 'alex_idle.png' },
  { name: 'Amelia', file: 'amelia_idle.png' },
  { name: 'Bob', file: 'bob_idle.png' },
] as const;

function CharacterPreview({ file, selected, onClick }: { file: string; selected: boolean; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = `/assets/characters/${file}`;
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw first frame (16x32) scaled up 4x to 64x128
      ctx.drawImage(img, 0, 0, 16, 32, 0, 0, 64, 128);
    };
  }, [file]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
        selected
          ? 'border-primary bg-primary/10 shadow-lg scale-105'
          : 'border-border hover:border-primary/50 hover:bg-muted'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={64}
        height={128}
        style={{ imageRendering: 'pixelated' }}
      />
    </button>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedChar, setSelectedChar] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, displayName, selectedChar);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="retro-shell min-h-screen text-white">
      <Navbar />
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 pb-12 pt-24 lg:grid-cols-[minmax(0,1fr)_480px]">
        <div className="retro-panel hidden rounded-[36px] p-6 lg:block">
          <p className="retro-display text-[11px] text-amber-200/70">New Workspace</p>
          <OfficeLottie className="mt-3 h-[34rem] w-full rounded-[30px] bg-black/10 p-4" />
        </div>

        <div className="retro-panel w-full rounded-[36px] p-8">
          <div className="mb-6">
            <p className="retro-display text-[11px] text-[#9ae6c1]/70">Register</p>
            <h1 className="mt-3 text-3xl font-semibold">Create your account</h1>
            <p className="mt-2 text-sm text-slate-300/75">Pick an avatar and step into the office.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="mb-1 block text-sm font-medium">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={30}
                className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                placeholder="Your name"
              />
            </div>

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
                minLength={8}
                autoComplete="new-password"
                className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                placeholder="At least 8 characters"
              />
            </div>

            {/* Character Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium">Choose your character</label>
              <div className="grid grid-cols-4 gap-3">
                {CHARACTERS.map((char, i) => (
                  <CharacterPreview
                    key={char.name}
                    file={char.file}
                    selected={selectedChar === i}
                    onClick={() => setSelectedChar(i)}
                  />
                ))}
              </div>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                {CHARACTERS[selectedChar]?.name}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="retro-button w-full rounded-full py-3 font-medium disabled:opacity-45"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-300/75">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
