'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/layout/Navbar';
import { OfficeLottie } from '@/components/retro/OfficeLottie';

interface SpacePermissions {
  canInvite: boolean;
  canManageRooms: boolean;
  canManageMembers: boolean;
  canBroadcast: boolean;
  canManageAssets: boolean;
}

interface SpaceData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  visibility: 'public' | 'private' | 'invite-only';
  myRole?: string;
  myPermissions?: SpacePermissions | null;
  isMember: boolean;
  defaultRoomId?: string;
}

interface RoomData {
  _id: string;
  name: string;
  type: string;
  templateKey?: string;
  maxOccupancy: number;
  isLocked: boolean;
  order: number;
  isDefault?: boolean;
}

function SkeletonRoomCard() {
  return (
    <div className="retro-panel rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton mt-2 h-5 w-36 rounded" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="mt-5">
        <div className="skeleton h-9 w-20 rounded-full" />
      </div>
    </div>
  );
}

function SpaceContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSpace = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await api<SpaceData>(`/spaces/${slug}`, { token: accessToken });
      setSpace(data);

      const roomsData = await api<RoomData[]>(`/rooms/space/${data._id}`, { token: accessToken });
      setRooms(roomsData);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [accessToken, router, slug]);

  useEffect(() => {
    fetchSpace();
  }, [fetchSpace]);

  async function handleJoin() {
    if (!accessToken) return;
    await api(`/spaces/${slug}/join`, { method: 'POST', token: accessToken });
    await fetchSpace();
  }

  async function handleLeave() {
    if (!accessToken) return;
    await api(`/spaces/${slug}/leave`, { method: 'POST', token: accessToken });
    await fetchSpace();
  }

  if (loading || !space) {
    return (
      <div className="retro-shell min-h-screen">
        <Navbar />
        <main className="w-full px-6 pb-16 pt-24 sm:px-10">
          <div className="skeleton mb-4 h-4 w-40 rounded" />
          <div className="retro-panel rounded-[36px] px-6 py-8">
            <div className="skeleton h-8 w-64 rounded" />
            <div className="skeleton mt-4 h-12 w-full max-w-xl rounded" />
            <div className="skeleton mt-4 h-4 w-96 rounded" />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SkeletonRoomCard />
            <SkeletonRoomCard />
            <SkeletonRoomCard />
          </div>
        </main>
      </div>
    );
  }

  const canManageRooms = Boolean(space.myPermissions?.canManageRooms);
  const isOwner = space.myRole === 'owner';
  const canAccessSettings = isOwner || canManageRooms;

  return (
    <div className="retro-shell min-h-screen text-foreground">
      <Navbar />

      <main className="w-full px-6 pb-16 pt-24 sm:px-10">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
          {canAccessSettings && (
            <Link
              href={`/space/${slug}/settings`}
              className="flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          )}
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="retro-panel relative overflow-hidden rounded-[36px] px-6 py-8">
            <div className="ambient-orb left-10 top-8 h-28 w-28 bg-foreground/8" />
            <div className="ambient-orb bottom-8 right-8 h-24 w-24 bg-foreground/6" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs capitalize text-muted-foreground">
                  {space.visibility}
                </span>
                {space.myRole && (
                  <span className="rounded-full border border-border bg-foreground/10 px-3 py-1 text-xs capitalize text-foreground/80 font-medium">
                    {space.myRole}
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{space.name}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {space.description || 'Shape a collaborative office with curated rooms, live movement, and in-world conversations.'}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {space.isMember ? (
                  <>
                    {space.defaultRoomId && (
                      <Link
                        href={`/game/${space.defaultRoomId}`}
                        className="retro-button rounded-full px-5 py-3 text-sm font-medium"
                      >
                        Enter Default Room
                      </Link>
                    )}
                    {!isOwner && (
                      <button
                        onClick={handleLeave}
                        className="rounded-full border border-border bg-secondary px-5 py-3 text-sm font-medium text-foreground/80 hover:bg-muted"
                      >
                        Leave Space
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleJoin}
                    className="retro-button rounded-full px-5 py-3 text-sm font-medium"
                  >
                    Join Public Space
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="retro-panel rounded-[36px] p-5">
            <p className="retro-display text-[11px] text-foreground/50">Ambient Preview</p>
            <OfficeLottie className="mt-3 h-64 w-full rounded-[28px] bg-muted p-4" />
          </div>
        </section>

        {/* Rooms — clean view, Enter/Leave only */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="retro-display text-[11px] text-foreground/50">Rooms</p>
              <h2 className="mt-1 text-2xl font-semibold">Navigate the space</h2>
            </div>
            <span className="rounded-full border border-border bg-secondary px-4 py-2 text-xs text-muted-foreground">
              {rooms.length} rooms
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div key={room._id} className="retro-panel overflow-hidden rounded-[28px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="retro-display text-[10px] text-foreground/50">
                      {room.templateKey?.replace(/-/g, ' ')}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{room.name}</h3>
                  </div>
                  {room.isDefault && (
                    <span className="rounded-full border border-border bg-foreground/10 px-3 py-1 text-xs text-foreground/80 font-medium">
                      Default
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-secondary px-3 py-1">
                    {room.type}
                  </span>
                  <span className="rounded-full border border-border bg-secondary px-3 py-1">
                    max {room.maxOccupancy}
                  </span>
                  {room.isLocked && (
                    <span className="rounded-full border border-border bg-secondary px-3 py-1">
                      🔒 locked
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  {space.isMember ? (
                    <Link
                      href={`/game/${room._id}`}
                      className="retro-button inline-block rounded-full px-4 py-2 text-sm font-medium"
                    >
                      Enter
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="rounded-full border border-border bg-secondary px-4 py-2 text-sm text-muted-foreground"
                    >
                      Join space to enter
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <AuthGuard>
      <SpaceContent params={params} />
    </AuthGuard>
  );
}
