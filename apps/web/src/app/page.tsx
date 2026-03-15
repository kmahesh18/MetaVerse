'use client';

import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { OfficeLottie } from '@/components/retro/OfficeLottie';
import { GuestGuard } from '@/components/GuestGuard';

const features = [
  {
    title: 'Curated room builder',
    desc: 'Start with a friendly lobby, repeat any of the six room types, and keep the room graph clean.',
  },
  {
    title: 'Live movement and chat',
    desc: 'WebSocket movement sync, public and private conversation modes, and proximity-aware interactions.',
  },
  {
    title: 'Manual WebRTC sessions',
    desc: 'Opt into meeting-room calls or start a nearby 1:1 without forcing everyone into always-on video.',
  },
  {
    title: 'Open public collaboration',
    desc: 'Public spaces behave like open-source workshops: join, contribute, and help manage the workspace.',
  },
];

function LandingContent() {
  return (
    <div className="retro-shell min-h-screen text-foreground">
      <Navbar />

      <main className="w-full px-6 pb-16 pt-24 sm:px-10">
        <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="retro-panel relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
            <div className="ambient-orb left-10 top-10 h-28 w-28 bg-foreground/10" />
            <div className="ambient-orb bottom-10 right-10 h-24 w-24 bg-foreground/10" />
            <div className="relative z-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-4 py-2 text-xs text-muted-foreground">
                <span className="retro-display text-[10px] text-foreground/70">Open Source Space Engine</span>
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                Build a retro 2D office where people actually want to stay.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                Create curated rooms, bring collaborators in with invitations or public access, move in
                real time, and hop into manual video sessions only when the moment calls for it.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="retro-button rounded-full px-6 py-3 text-sm font-medium"
                >
                  Launch Your Space
                </Link>
                <Link
                  href="/login"
                  className="retro-button-subtle px-6 py-3 text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>

          <div className="retro-panel p-5">
            <p className="retro-display text-[11px] text-foreground/60">Animated Office Preview</p>
            <OfficeLottie className="mt-3 h-[26rem] w-full rounded-[var(--radius)] bg-background/50 p-4" />
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="retro-panel p-5">
              <p className="retro-display text-[11px] text-foreground/60">Feature</p>
              <h2 className="mt-3 text-xl font-semibold text-foreground">{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <GuestGuard>
      <LandingContent />
    </GuestGuard>
  );
}

