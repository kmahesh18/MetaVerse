'use client';

import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { OfficeLottie } from '@/components/retro/OfficeLottie';

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

export default function Home() {
  return (
    <div className="retro-shell min-h-screen text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6">
        <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="retro-panel relative overflow-hidden rounded-[38px] px-6 py-8 sm:px-8 sm:py-10">
            <div className="ambient-orb left-10 top-10 h-28 w-28 bg-primary/18" />
            <div className="ambient-orb bottom-10 right-10 h-24 w-24 bg-accent/18" />
            <div className="relative z-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200/80">
                <span className="retro-display text-[10px] text-[#9ae6c1]/80">Open Source Space Engine</span>
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                Build a retro 2D office where people actually want to stay.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300/80">
                Create curated rooms, bring collaborators in with invitations or public access, move in
                real time, and hop into manual video sessions only when the moment calls for it.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="retro-button rounded-full px-6 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5"
                >
                  Launch Your Space
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-100/85 transition-colors hover:bg-white/10"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>

          <div className="retro-panel rounded-[38px] p-5">
            <p className="retro-display text-[11px] text-amber-200/70">Animated Office Preview</p>
            <OfficeLottie className="mt-3 h-[26rem] w-full rounded-[30px] bg-black/10 p-4" />
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="retro-panel rounded-[30px] p-5">
              <p className="retro-display text-[11px] text-[#9ae6c1]/70">Feature</p>
              <h2 className="mt-3 text-xl font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300/78">{feature.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
