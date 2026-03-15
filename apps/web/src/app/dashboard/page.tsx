'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useNotificationStore } from '@/lib/notification-store';
import { api } from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import { AuthGuard } from '@/components/AuthGuard';
import { SpaceCard } from '@/components/space/SpaceCard';
import { CreateSpaceModal } from '@/components/space/CreateSpaceModal';
import { OfficeLottie } from '@/components/retro/OfficeLottie';

interface SpaceData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  visibility: string;
  myRole?: string;
}

function SkeletonCard() {
  return (
    <div className="retro-panel rounded-[28px] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="skeleton h-12 w-12 rounded-2xl" />
          <div>
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton mt-2 h-5 w-32 rounded" />
          </div>
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton mt-2 h-4 w-3/4 rounded" />
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user, accessToken, logout } = useAuthStore();
  const [spaces, setSpaces] = useState<SpaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [inviteActionToken, setInviteActionToken] = useState<string | null>(null);
  const invitations = useNotificationStore((s) => s.invitations);
  const setInvitations = useNotificationStore((s) => s.setInvitations);
  const removeInvitation = useNotificationStore((s) => s.removeInvitation);
  const markInvitationsSeen = useNotificationStore((s) => s.markInvitationsSeen);

  const fetchSpaces = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await api<SpaceData[]>('/spaces', { token: accessToken });
      setSpaces(data);
    } catch {
      // ignore dashboard fetch failures here
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchInvitations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await api<Array<{
        _id: string;
        token: string;
        role: string;
        createdAt: string;
        inviterId?: { _id: string; displayName: string } | null;
        spaceId?: { _id: string; name: string; slug: string } | null;
      }>>('/invitations/my', { token: accessToken });

      setInvitations(
        data
          .filter((invitation) => invitation.spaceId)
          .map((invitation) => ({
            invitationId: invitation._id,
            token: invitation.token,
            spaceId: invitation.spaceId?._id ?? '',
            spaceName: invitation.spaceId?.name ?? 'Shared space',
            spaceSlug: invitation.spaceId?.slug ?? '',
            inviterId: invitation.inviterId?._id ?? '',
            inviterName: invitation.inviterId?.displayName ?? 'A teammate',
            role: invitation.role,
            createdAt: invitation.createdAt,
          }))
      );
    } catch {
      setInvitations([]);
    }
  }, [accessToken, setInvitations]);

  useEffect(() => {
    fetchSpaces();
    fetchInvitations();
  }, [fetchInvitations, fetchSpaces]);

  useEffect(() => {
    markInvitationsSeen();
  }, [markInvitationsSeen]);

  async function handleInvitationAction(token: string, action: 'accept' | 'decline') {
    if (!accessToken) return;
    setInviteActionToken(token);
    try {
      await api(`/invitations/${token}/${action}`, {
        method: 'POST',
        token: accessToken,
      });
      removeInvitation(token);
      if (action === 'accept') {
        await fetchSpaces();
      }
      await fetchInvitations();
    } finally {
      setInviteActionToken(null);
    }
  }

  return (
    <div className="retro-shell min-h-screen text-foreground">
      <Navbar />

      <main className="w-full px-6 pb-16 pt-24 sm:px-10">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="retro-panel relative overflow-hidden rounded-[36px] px-6 py-8">
            <div className="ambient-orb left-8 top-10 h-28 w-28 bg-foreground/10" />
            <div className="ambient-orb bottom-6 right-8 h-24 w-24 bg-foreground/10" />
            <div className="relative z-10">
              <p className="retro-display text-[11px] text-foreground/60">Control Deck</p>
              <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Build rooms, welcome people, and keep the office moving.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Welcome back, {user?.displayName}. Your dashboard is now the planning layer for the
                world: invitations, room blueprints, and space access all start here.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setShowCreate(true)}
                  className="retro-button rounded-full px-5 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5"
                >
                  + Create Space
                </button>
                <button
                  onClick={() => logout()}
                  className="retro-button-subtle px-5 py-3 text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="retro-panel p-5">
            <p className="retro-display text-[11px] text-foreground/60">Office Feed</p>
            <OfficeLottie className="mt-3 h-56 w-full rounded-[var(--radius)] bg-background/50 p-4" />
          </div>
        </section>

        <section id="invitations" className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="retro-display text-[11px] text-foreground/60">Joined Spaces</p>
                <h2 className="mt-1 text-2xl font-semibold">Your active environments</h2>
              </div>
              <span className="retro-chip">
                {spaces.length} spaces
              </span>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : spaces.length === 0 ? (
              <div className="retro-panel p-10 text-center">
                <div className="text-5xl">🕹️</div>
                <h3 className="mt-4 text-xl font-semibold">No spaces yet</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                  Start with a lobby and office, then add the extra rooms your community actually needs.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="retro-button mt-6 rounded-full px-5 py-3 text-sm font-medium"
                >
                  Create your first space
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {spaces.map((space) => (
                  <SpaceCard key={space._id} space={space} />
                ))}
              </div>
            )}
          </div>

          <aside className="retro-panel p-5">
            <p className="retro-display text-[11px] text-foreground/60">Invitation Inbox</p>
            <h2 className="mt-2 text-xl font-semibold">Pending access requests</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Accept invitations from private or invite-only spaces, or clear out requests you do not need.
            </p>

            <div className="mt-5 space-y-3">
              {invitations.length === 0 ? (
                <div className="rounded-[var(--radius)] border border-dashed border-border bg-background px-4 py-5 text-sm text-muted-foreground">
                  No pending invitations right now.
                </div>
              ) : (
                invitations.map((invitation) => (
                  <div key={invitation.token} className="rounded-[var(--radius)] border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="retro-display text-[10px] text-foreground/60">{invitation.role}</p>
                        <h3 className="mt-1 font-semibold">{invitation.spaceName}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Invited by {invitation.inviterName}
                        </p>
                      </div>
                      <LinkPill href={`/space/${invitation.spaceSlug}`} />
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleInvitationAction(invitation.token, 'accept')}
                        disabled={inviteActionToken === invitation.token}
                        className="retro-button flex-1 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-45"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleInvitationAction(invitation.token, 'decline')}
                        disabled={inviteActionToken === invitation.token}
                        className="retro-button-subtle flex-1 px-4 py-2 text-sm disabled:opacity-45"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
      </main>

      <CreateSpaceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchSpaces}
      />
    </div>
  );
}

function LinkPill({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="retro-chip transition-colors hover:bg-foreground hover:text-background"
    >
      Preview
    </a>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
