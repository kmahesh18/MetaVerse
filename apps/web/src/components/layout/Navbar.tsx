'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useNotificationStore } from '@/lib/notification-store';
import { toggleTheme } from '@/providers/ThemeProvider';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const unreadInvitationCount = useNotificationStore((s) => s.unreadInvitationCount);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="marquee-glow flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-xl">
            🏢
          </div>
          <div>
            <div className="retro-display text-[11px] text-primary/80">Virtual Office</div>
            <div className="text-base font-semibold tracking-tight group-hover:text-primary transition-colors">
              Metaverse
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <Link
              href="/dashboard#invitations"
              className="relative rounded-full border border-border/70 bg-white/5 px-3 py-2 text-sm transition-colors hover:bg-white/10"
            >
              Inbox
              {unreadInvitationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-[#1f140a]">
                  {unreadInvitationCount}
                </span>
              )}
            </Link>
          )}

          <button
            onClick={toggleTheme}
            className="rounded-full border border-border/70 bg-white/5 p-2.5 transition-colors hover:bg-white/10"
            aria-label="Toggle theme"
          >
            <svg className="hidden h-5 w-5 dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v2.5m0 13V21m9-9h-2.5M5.5 12H3m14.864 6.364-1.768-1.768M7.404 7.404 5.636 5.636m12.728 0-1.768 1.768M7.404 16.596l-1.768 1.768M15.5 12a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
            </svg>
            <svg className="block h-5 w-5 dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A8.5 8.5 0 018.646 3.646 8.5 8.5 0 1012 20.5a8.46 8.46 0 008.354-5.146z" />
            </svg>
          </button>

          {user ? (
            <Link
              href="/dashboard"
              className="retro-button rounded-full px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-border/70 bg-white/5 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="retro-button rounded-full px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
