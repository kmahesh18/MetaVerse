'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CURATED_ROOM_TEMPLATES } from '@metaverse/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/layout/Navbar';
import { RetroSelect } from '@/components/ui/Select';

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

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'invite-only', label: 'Invite Only' },
];

const ROLE_OPTIONS = ['member', 'moderator', 'collaborator', 'admin'].map((r) => ({
  label: r.charAt(0).toUpperCase() + r.slice(1),
  value: r,
}));

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="retro-panel p-6">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton mt-3 h-6 w-48 rounded" />
          <div className="skeleton mt-4 h-10 w-full rounded-2xl" />
          <div className="skeleton mt-3 h-10 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function SettingsContent({ params }: { params: Promise<{ slug: string }> }) {
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
  const [spaceNameDraft, setSpaceNameDraft] = useState('');
  const [spaceDescDraft, setSpaceDescDraft] = useState('');
  const [spaceVisibilityDraft, setSpaceVisibilityDraft] = useState<string>('private');
  const [savingSpace, setSavingSpace] = useState(false);

  const fetchSpace = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await api<SpaceData>(`/spaces/${slug}`, { token: accessToken });
      setSpace(data);
      setSpaceNameDraft(data.name);
      setSpaceDescDraft(data.description || '');
      setSpaceVisibilityDraft(data.visibility);

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

  // Redirect non-owners/non-admins
  useEffect(() => {
    if (!loading && space) {
      const canManage = space.myRole === 'owner' || Boolean(space.myPermissions?.canManageRooms);
      if (!canManage) {
        router.push(`/space/${slug}`);
      }
    }
  }, [loading, space, slug, router]);

  async function handleSaveSpace() {
    if (!accessToken || !space) return;
    setSavingSpace(true);
    try {
      await api(`/spaces/${slug}`, {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify({
          name: spaceNameDraft,
          description: spaceDescDraft,
          visibility: spaceVisibilityDraft,
        }),
      });
      await fetchSpace();
    } finally {
      setSavingSpace(false);
    }
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
        <main className="w-full px-6 pb-16 pt-24 sm:px-10">
          <div className="skeleton mb-4 h-4 w-40 rounded" />
          <SettingsSkeleton />
        </main>
      </div>
    );
  }

  const canManageRooms = Boolean(space.myPermissions?.canManageRooms);
  const canManageMembers = Boolean(space.myPermissions?.canManageMembers);
  const canInvite = Boolean(space.myPermissions?.canInvite);
  const isOwner = space.myRole === 'owner';

  return (
    <div className="retro-shell min-h-screen text-foreground">
      <Navbar />

      <main className="w-full px-6 pb-16 pt-24 sm:px-10">
        <div className="mb-6">
          <Link href={`/space/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to {space.name}
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Space Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage your space configuration, rooms, and members.</p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* Left column: Space config + rooms */}
          <div className="space-y-8">
            {/* Space Configuration */}
            {isOwner && (
              <section className="retro-panel p-6">
                <p className="retro-display text-[11px] text-foreground/50">Configuration</p>
                <h2 className="mt-2 text-xl font-semibold">Space Details</h2>

                <div className="mt-5 space-y-4">
                  <label className="block space-y-2">
                    <span className="retro-display text-[10px] text-muted-foreground">Space Name</span>
                    <input
                      type="text"
                      value={spaceNameDraft}
                      onChange={(e) => setSpaceNameDraft(e.target.value)}
                      className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="retro-display text-[10px] text-muted-foreground">Description</span>
                    <textarea
                      value={spaceDescDraft}
                      onChange={(e) => setSpaceDescDraft(e.target.value)}
                      rows={3}
                      className="retro-input w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none"
                    />
                  </label>
                  <div className="space-y-2">
                    <span className="retro-display text-[10px] text-muted-foreground">Visibility</span>
                    <RetroSelect
                      value={spaceVisibilityDraft}
                      onChange={setSpaceVisibilityDraft}
                      options={VISIBILITY_OPTIONS}
                    />
                  </div>
                  <button
                    onClick={handleSaveSpace}
                    disabled={savingSpace}
                    className="retro-button rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-45"
                  >
                    {savingSpace ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </section>
            )}

            {/* Room Management */}
            {canManageRooms && (
              <section className="retro-panel p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="retro-display text-[11px] text-foreground/50">Room Management</p>
                    <h2 className="mt-2 text-xl font-semibold">Manage Rooms</h2>
                  </div>
                  <span className="retro-chip">{rooms.length} / 8</span>
                </div>

                <div className="space-y-4">
                  {rooms.map((room, index) => (
                    <div key={room._id} className="rounded-[20px] border border-border bg-secondary p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {room.isDefault && (
                            <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-[10px] retro-display text-foreground/80">
                              Default
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">Room {index + 1}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateRoom(room._id, { order: Math.max(0, index - 1) })}
                            disabled={index === 0 || roomActionId === room._id}
                            className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => updateRoom(room._id, { order: Math.min(rooms.length - 1, index + 1) })}
                            disabled={index === rooms.length - 1 || roomActionId === room._id}
                            className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                          >
                            ↓
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1">
                          <span className="retro-display text-[10px] text-muted-foreground">Name</span>
                          <input
                            type="text"
                            value={room.name}
                            onChange={(e) =>
                              setRooms((current) =>
                                current.map((entry) =>
                                  entry._id === room._id ? { ...entry, name: e.target.value } : entry
                                )
                              )
                            }
                            className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="retro-display text-[10px] text-muted-foreground">Template</span>
                          <RetroSelect
                            value={room.templateKey || 'office'}
                            onChange={(val) =>
                              setRooms((current) =>
                                current.map((entry) =>
                                  entry._id === room._id ? { ...entry, templateKey: val } : entry
                                )
                              )
                            }
                            options={ROOM_TEMPLATE_OPTIONS}
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
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
                          className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground/80 hover:bg-muted disabled:opacity-45"
                        >
                          {room.isLocked ? '🔓 Unlock' : '🔒 Lock'}
                        </button>
                        {!room.isDefault && (
                          <button
                            onClick={() => updateRoom(room._id, { isDefault: true })}
                            disabled={roomActionId === room._id}
                            className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground/80 hover:bg-muted disabled:opacity-45"
                          >
                            Make Default
                          </button>
                        )}
                        <button
                          onClick={() => deleteRoom(room._id)}
                          disabled={roomActionId === room._id}
                          className="rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive hover:bg-destructive/20 disabled:opacity-45"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add new room */}
                <div className="mt-6 rounded-[20px] border border-dashed border-border bg-background p-4">
                  <p className="retro-display text-[10px] text-foreground/50 mb-3">Add New Room</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={roomDraft.name}
                      onChange={(e) => setRoomDraft((c) => ({ ...c, name: e.target.value }))}
                      className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                      placeholder="Room name"
                    />
                    <RetroSelect
                      value={roomDraft.templateKey}
                      onChange={(val) => setRoomDraft((c) => ({ ...c, templateKey: val }))}
                      options={ROOM_TEMPLATE_OPTIONS}
                    />
                  </div>
                  <button
                    onClick={createRoom}
                    disabled={roomActionId === 'create' || rooms.length >= 8}
                    className="retro-button mt-3 w-full rounded-full px-4 py-3 text-sm font-medium disabled:opacity-45"
                  >
                    {rooms.length >= 8 ? 'Room limit reached (8/8)' : '+ Create Room'}
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* Right column: Members & Invitations */}
          <div className="space-y-6">
            {canInvite && (
              <section className="retro-panel p-6">
                <p className="retro-display text-[11px] text-foreground/50">Invitations</p>
                <h2 className="mt-2 text-xl font-semibold">Invite People</h2>
                <div className="mt-4 flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@email.com"
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

                {invitations.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="retro-display text-[10px] text-foreground/50">Pending</p>
                    {invitations.map((inv) => (
                      <div key={inv._id} className="rounded-[16px] border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
                        {inv.inviteeEmail} · {inv.role}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="retro-panel p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="retro-display text-[11px] text-foreground/50">People</p>
                  <h2 className="mt-2 text-xl font-semibold">Members</h2>
                </div>
                <span className="retro-chip">{members.length}</span>
              </div>

              <div className="mt-5 space-y-3">
                {members.map((member) => (
                  <div key={member._id} className="rounded-[20px] border border-border bg-secondary p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{member.userId.displayName}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{member.userId.email}</p>
                      </div>
                      <span className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize text-muted-foreground">
                        {member.role}
                      </span>
                    </div>
                    {canManageMembers && member.userId._id !== user?._id && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <RetroSelect
                          value={member.role}
                          onChange={(val) => updateMemberRole(member.userId._id, val)}
                          options={ROLE_OPTIONS}
                          className="w-40"
                        />
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => removeMember(member.userId._id)}
                            className="rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive hover:bg-destructive/20"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <AuthGuard>
      <SettingsContent params={params} />
    </AuthGuard>
  );
}
