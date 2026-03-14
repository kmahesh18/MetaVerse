'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CURATED_ROOM_TEMPLATES } from '@metaverse/shared';
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

interface MemberData {
  _id: string;
  role: string;
  permissions: SpacePermissions;
  userId: {
    _id: string;
    displayName: string;
    email?: string;
    status?: string;
  };
}

interface SpaceInvitationData {
  _id: string;
  token: string;
  inviteeEmail: string;
  role: string;
  inviterId?: {
    displayName: string;
  } | null;
}

const ROOM_TEMPLATE_OPTIONS = CURATED_ROOM_TEMPLATES.map((template) => ({
  value: template.key,
  label: template.name,
}));

function SpaceContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [roomDraft, setRoomDraft] = useState({ name: 'New Room', templateKey: 'meeting-studio' });
  const [roomActionId, setRoomActionId] = useState<string | null>(null);

  const fetchSpace = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await api<SpaceData>(`/spaces/${slug}`, { token: accessToken });
      setSpace(data);

      const roomsData = await api<RoomData[]>(`/rooms/space/${data._id}`, { token: accessToken });
      setRooms(roomsData);

      if (data.isMember) {
        const [membersData, invitationsData] = await Promise.all([
          api<MemberData[]>(`/spaces/${slug}/members`, { token: accessToken }),
          data.myPermissions?.canInvite || data.myPermissions?.canManageMembers
            ? api<SpaceInvitationData[]>(`/invitations/space/${data._id}`, { token: accessToken })
            : Promise.resolve([]),
        ]);
        setMembers(membersData);
        setInvitations(invitationsData);
      } else {
        setMembers([]);
        setInvitations([]);
      }
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

  async function handleInvite() {
    if (!accessToken || !space || !inviteEmail) return;
    setInviteLoading(true);
    try {
      await api('/invitations', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          spaceId: space._id,
          inviteeEmail: inviteEmail,
        }),
      });
      setInviteEmail('');
      await fetchSpace();
    } finally {
      setInviteLoading(false);
    }
  }

  async function updateMemberRole(memberUserId: string, role: string) {
    if (!accessToken) return;
    await api(`/spaces/${slug}/members/${memberUserId}`, {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({ role }),
    });
    await fetchSpace();
  }

  async function removeMember(memberUserId: string) {
    if (!accessToken) return;
    await api(`/spaces/${slug}/members/${memberUserId}`, {
      method: 'DELETE',
      token: accessToken,
    });
    await fetchSpace();
  }

  async function createRoom() {
    if (!accessToken || !space) return;
    setRoomActionId('create');
    try {
      await api('/rooms', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          spaceId: space._id,
          name: roomDraft.name,
          templateKey: roomDraft.templateKey,
          isDefault: false,
        }),
      });
      setRoomDraft({ name: 'New Room', templateKey: 'meeting-studio' });
      await fetchSpace();
    } finally {
      setRoomActionId(null);
    }
  }

  async function updateRoom(roomId: string, patch: Partial<RoomData> & { isDefault?: boolean }) {
    if (!accessToken) return;
    setRoomActionId(roomId);
    try {
      await api(`/rooms/${roomId}`, {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify(patch),
      });
      await fetchSpace();
    } finally {
      setRoomActionId(null);
    }
  }

  async function deleteRoom(roomId: string) {
    if (!accessToken) return;
    setRoomActionId(roomId);
    try {
      await api(`/rooms/${roomId}`, {
        method: 'DELETE',
        token: accessToken,
      });
      await fetchSpace();
    } finally {
      setRoomActionId(null);
    }
  }

  if (loading || !space) {
    return (
      <div className="retro-shell min-h-screen">
        <Navbar />
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const canManageRooms = Boolean(space.myPermissions?.canManageRooms);
  const canManageMembers = Boolean(space.myPermissions?.canManageMembers);
  const canInvite = Boolean(space.myPermissions?.canInvite);
  const isOwner = space.myRole === 'owner';

  return (
    <div className="retro-shell min-h-screen text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6">
        <div className="mb-4">
          <Link href="/dashboard" className="text-sm text-slate-300/80 hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="retro-panel relative overflow-hidden rounded-[36px] px-6 py-8">
            <div className="ambient-orb left-10 top-8 h-28 w-28 bg-primary/18" />
            <div className="ambient-orb bottom-8 right-8 h-24 w-24 bg-accent/16" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs capitalize text-slate-200/80">
                  {space.visibility}
                </span>
                {space.myRole && (
                  <span className="rounded-full border border-white/10 bg-primary/15 px-3 py-1 text-xs capitalize text-emerald-50">
                    {space.myRole}
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{space.name}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300/80 sm:text-base">
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
                        className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100/80 hover:bg-white/10"
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
            <p className="retro-display text-[11px] text-amber-200/70">Ambient Preview</p>
            <OfficeLottie className="mt-3 h-64 w-full rounded-[28px] bg-black/10 p-4" />
          </div>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="retro-display text-[11px] text-[#9ae6c1]/70">Rooms</p>
                <h2 className="mt-1 text-2xl font-semibold">Navigate the space</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300/75">
                {rooms.length} rooms
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {rooms.map((room, index) => (
                <div key={room._id} className="retro-panel rounded-[28px] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="retro-display text-[10px] text-amber-200/70">
                        {room.templateKey?.replace(/-/g, ' ')}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">{room.name}</h3>
                    </div>
                    {room.isDefault && (
                      <span className="rounded-full border border-primary/25 bg-primary/15 px-3 py-1 text-xs text-emerald-50">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300/75">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      {room.type}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      max {room.maxOccupancy}
                    </span>
                    {room.isLocked && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        locked
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {space.isMember ? (
                      <Link
                        href={`/game/${room._id}`}
                        className="retro-button rounded-full px-4 py-2 text-sm font-medium"
                      >
                        Enter
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400"
                      >
                        Join space to enter
                      </button>
                    )}

                    {canManageRooms && (
                      <>
                        <button
                          onClick={() => updateRoom(room._id, { order: Math.max(0, index - 1) })}
                          disabled={index === 0 || roomActionId === room._id}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100/80 hover:bg-white/10 disabled:opacity-40"
                        >
                          Move Up
                        </button>
                        <button
                          onClick={() => updateRoom(room._id, { order: Math.min(rooms.length - 1, index + 1) })}
                          disabled={index === rooms.length - 1 || roomActionId === room._id}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100/80 hover:bg-white/10 disabled:opacity-40"
                        >
                          Move Down
                        </button>
                      </>
                    )}
                  </div>

                  {canManageRooms && (
                    <div className="mt-5 grid gap-3 border-t border-white/10 pt-4">
                      <input
                        type="text"
                        value={room.name}
                        onChange={(event) =>
                          setRooms((current) =>
                            current.map((entry) =>
                              entry._id === room._id ? { ...entry, name: event.target.value } : entry
                            )
                          )
                        }
                        className="retro-input rounded-2xl px-4 py-3 text-sm outline-none"
                      />
                      <select
                        value={room.templateKey}
                        onChange={(event) =>
                          setRooms((current) =>
                            current.map((entry) =>
                              entry._id === room._id
                                ? { ...entry, templateKey: event.target.value }
                                : entry
                            )
                          )
                        }
                        className="retro-input rounded-2xl px-4 py-3 text-sm outline-none"
                      >
                        {ROOM_TEMPLATE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className="text-black">
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            updateRoom(room._id, {
                              name: room.name,
                              templateKey: room.templateKey,
                              isLocked: room.isLocked,
                            })
                          }
                          disabled={roomActionId === room._id}
                          className="retro-button rounded-full px-4 py-2 text-sm font-medium disabled:opacity-45"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => updateRoom(room._id, { isLocked: !room.isLocked })}
                          disabled={roomActionId === room._id}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100/85 hover:bg-white/10 disabled:opacity-45"
                        >
                          {room.isLocked ? 'Unlock' : 'Lock'}
                        </button>
                        {!room.isDefault && (
                          <button
                            onClick={() => updateRoom(room._id, { isDefault: true })}
                            disabled={roomActionId === room._id}
                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100/85 hover:bg-white/10 disabled:opacity-45"
                          >
                            Make Default
                          </button>
                        )}
                        <button
                          onClick={() => deleteRoom(room._id)}
                          disabled={roomActionId === room._id}
                          className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100/85 hover:bg-rose-400/20 disabled:opacity-45"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {canManageRooms && (
              <div className="retro-panel rounded-[32px] p-5">
                <p className="retro-display text-[11px] text-amber-200/70">Add Room</p>
                <h3 className="mt-2 text-xl font-semibold">Extend the blueprint</h3>
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={roomDraft.name}
                    onChange={(event) => setRoomDraft((current) => ({ ...current, name: event.target.value }))}
                    className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    placeholder="Community Review"
                  />
                  <select
                    value={roomDraft.templateKey}
                    onChange={(event) => setRoomDraft((current) => ({ ...current, templateKey: event.target.value }))}
                    className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  >
                    {ROOM_TEMPLATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={createRoom}
                    disabled={roomActionId === 'create' || rooms.length >= 8}
                    className="retro-button w-full rounded-full px-4 py-3 text-sm font-medium disabled:opacity-45"
                  >
                    {rooms.length >= 8 ? 'Room limit reached' : 'Create Room'}
                  </button>
                </div>
              </div>
            )}

            {space.isMember && (
              <div className="retro-panel rounded-[32px] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="retro-display text-[11px] text-[#9ae6c1]/70">People</p>
                    <h3 className="mt-2 text-xl font-semibold">Members and invites</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300/75">
                    {members.length} members
                  </span>
                </div>

                {canInvite && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="invite teammate@email.com"
                      className="retro-input flex-1 rounded-full px-4 py-3 text-sm outline-none"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={inviteLoading || !inviteEmail}
                      className="retro-button rounded-full px-4 py-3 text-sm font-medium disabled:opacity-45"
                    >
                      Invite
                    </button>
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  {members.map((member) => (
                    <div key={member._id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold">{member.userId.displayName}</h4>
                          <p className="mt-1 text-sm text-slate-300/75">{member.userId.email}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs capitalize text-slate-200/80">
                          {member.role}
                        </span>
                      </div>
                      {canManageMembers && member.userId._id !== user?._id && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <select
                            value={member.role}
                            onChange={(event) => updateMemberRole(member.userId._id, event.target.value)}
                            className="retro-input rounded-full px-4 py-2 text-sm outline-none"
                          >
                            {['member', 'moderator', 'collaborator', 'admin'].map((role) => (
                              <option key={role} value={role} className="text-black">
                                {role}
                              </option>
                            ))}
                          </select>
                          {member.role !== 'owner' && (
                            <button
                              onClick={() => removeMember(member.userId._id)}
                              className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100/85 hover:bg-rose-400/20"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {invitations.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="retro-display text-[11px] text-amber-200/70">Pending Invites</p>
                    <div className="mt-3 space-y-3">
                      {invitations.map((invitation) => (
                        <div key={invitation._id} className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200/85">
                          {invitation.inviteeEmail} · {invitation.role}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
