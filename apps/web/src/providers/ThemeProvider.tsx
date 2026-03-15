'use client';

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';

/**
 * Global reusable theme provider.
 * Applies 'dark' class to <html> and persists to localStorage.
 * Supports View Transitions API for smooth clip-path animation.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <>{children}</>;
}

/**
 * Animated theme toggle button with sun/moon icon.
 * Uses View Transitions API (where supported) for a circular clip-path
 * animation originating from the button. Falls back to instant toggle.
 */
export function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';

    // Get click coordinates for the circular animation origin
    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Use View Transitions API if available
    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        localStorage.setItem('theme', newTheme);
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 500,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      });
    } else {
      // Fallback: instant toggle
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('theme', newTheme);
    }
  }, []);

  return (
    <button
      ref={buttonRef}
      onClick={toggle}
      className="rounded-full border border-border bg-secondary text-foreground p-2.5 transition-colors hover:bg-muted"
      aria-label="Toggle theme"
    >
      {/* Sun icon — shown in dark mode (click to go light) */}
      <svg className="hidden h-5 w-5 dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v2.5m0 13V21m9-9h-2.5M5.5 12H3m14.864 6.364-1.768-1.768M7.404 7.404 5.636 5.636m12.728 0-1.768 1.768M7.404 16.596l-1.768 1.768M15.5 12a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
      </svg>
      {/* Moon icon — shown in light mode (click to go dark) */}
      <svg className="block h-5 w-5 dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A8.5 8.5 0 018.646 3.646 8.5 8.5 0 1012 20.5a8.46 8.46 0 008.354-5.146z" />
      </svg>
    </button>
  );
}

/**
 * Standalone toggle function for programmatic use.
 */
export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
