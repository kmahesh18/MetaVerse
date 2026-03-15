'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useNotificationStore } from '@/lib/notification-store';
import { ThemeToggle } from '@/providers/ThemeProvider';

export function Navbar() {
  const { user, isLoading } = useAuthStore();
  const unreadInvitationCount = useNotificationStore((s) => s.unreadInvitationCount);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full items-center justify-between px-6 sm:px-10">
        <Link href={user ? '/dashboard' : '/'} className="group flex items-center gap-3">
          <div className="marquee-glow flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/10 text-xl">
            🏢
          </div>
          <div>
            <div className="retro-display text-[11px] text-foreground/60">Virtual Office</div>
            <div className="text-base font-semibold tracking-tight group-hover:text-foreground/70 transition-colors">
              Metaverse
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {!isLoading && user && (
            <Link
              href="/dashboard#invitations"
              className="relative rounded-full border border-border bg-secondary px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              Inbox
              {unreadInvitationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
                  {unreadInvitationCount}
                </span>
              )}
            </Link>
          )}

          <ThemeToggle />

          {isLoading ? <div className="skeleton h-9 w-24 rounded-full"></div> : user ? (
            <Link
              href="/dashboard"
              className="retro-button px-4 py-2 text-sm font-medium"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="retro-button-subtle px-4 py-2 text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="retro-button px-4 py-2 text-sm font-medium"
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
