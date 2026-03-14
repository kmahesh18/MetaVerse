import { create } from 'zustand';

export interface InvitationPreview {
  invitationId: string;
  token: string;
  spaceId: string;
  spaceName: string;
  spaceSlug: string;
  inviterId: string;
  inviterName: string;
  role: string;
  createdAt: string;
}

interface NotificationState {
  invitations: InvitationPreview[];
  invitationCount: number;
  unreadInvitationCount: number;
  lastSeenAt: string | null;
  initializeSeenAt: () => void;
  setInvitations: (invitations: InvitationPreview[]) => void;
  setInvitationCount: (count: number) => void;
  receiveInvitation: (invitation: InvitationPreview) => void;
  removeInvitation: (token: string) => void;
  markInvitationsSeen: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'metaverse:last-invitation-seen-at';

function readSeenAt() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function writeSeenAt(value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, value);
}

function computeUnreadCount(invitations: InvitationPreview[], lastSeenAt: string | null) {
  if (!lastSeenAt) return invitations.length;
  const seenAt = new Date(lastSeenAt).getTime();
  return invitations.filter((invitation) => new Date(invitation.createdAt).getTime() > seenAt).length;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  invitations: [],
  invitationCount: 0,
  unreadInvitationCount: 0,
  lastSeenAt: null,

  initializeSeenAt: () => {
    const lastSeenAt = readSeenAt();
    set({
      lastSeenAt,
      unreadInvitationCount: computeUnreadCount(get().invitations, lastSeenAt),
    });
  },

  setInvitations: (invitations) => {
    const lastSeenAt = get().lastSeenAt ?? readSeenAt();
    set({
      invitations,
      invitationCount: invitations.length,
      lastSeenAt,
      unreadInvitationCount: computeUnreadCount(invitations, lastSeenAt),
    });
  },

  setInvitationCount: (count) => {
    set((state) => ({
      invitationCount: count,
      unreadInvitationCount: Math.min(state.unreadInvitationCount, count),
    }));
  },

  receiveInvitation: (invitation) =>
    set((state) => {
      if (state.invitations.some((entry) => entry.token === invitation.token)) {
        return state;
      }

      const invitations = [invitation, ...state.invitations];
      return {
        invitations,
        invitationCount: invitations.length,
        unreadInvitationCount: state.unreadInvitationCount + 1,
      };
    }),

  removeInvitation: (token) =>
    set((state) => {
      const invitations = state.invitations.filter((invitation) => invitation.token !== token);
      return {
        invitations,
        invitationCount: invitations.length,
        unreadInvitationCount: computeUnreadCount(invitations, state.lastSeenAt),
      };
    }),

  markInvitationsSeen: () => {
    const now = new Date().toISOString();
    writeSeenAt(now);
    set({ lastSeenAt: now, unreadInvitationCount: 0 });
  },

  reset: () => set({ invitations: [], invitationCount: 0, unreadInvitationCount: 0, lastSeenAt: null }),
}));
