'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useNotificationStore, type InvitationPreview } from '@/lib/notification-store';

export function AuthProvider({ children }: { children: ReactNode }) {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const accessToken = useAuthStore((s) => s.accessToken);
  const initializeSeenAt = useNotificationStore((s) => s.initializeSeenAt);
  const setInvitations = useNotificationStore((s) => s.setInvitations);
  const setInvitationCount = useNotificationStore((s) => s.setInvitationCount);
  const receiveInvitation = useNotificationStore((s) => s.receiveInvitation);
  const resetNotifications = useNotificationStore((s) => s.reset);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    initializeSeenAt();
  }, [initializeSeenAt]);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      resetNotifications();
      return;
    }

    let cancelled = false;
    const socket = connectSocket(accessToken);

    const handleInvitation = (invitation: InvitationPreview) => {
      receiveInvitation(invitation);
    };
    const handleInvitationCount = ({ count }: { count: number }) => {
      setInvitationCount(count);
    };

    socket.on('invitation:new', handleInvitation);
    socket.on('invitation:count', handleInvitationCount);

    (async () => {
      try {
        const invites = await api<Array<{
          _id: string;
          token: string;
          role: string;
          createdAt: string;
          inviterId?: { _id: string; displayName: string } | null;
          spaceId?: { _id: string; name: string; slug: string } | null;
        }>>('/invitations/my', { token: accessToken });

        if (cancelled) return;
        setInvitations(
          invites
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
        if (!cancelled) {
          setInvitations([]);
        }
      }
    })();

    return () => {
      cancelled = true;
      const activeSocket = getSocket();
      activeSocket?.off('invitation:new', handleInvitation);
      activeSocket?.off('invitation:count', handleInvitationCount);
    };
  }, [
    accessToken,
    receiveInvitation,
    resetNotifications,
    setInvitationCount,
    setInvitations,
  ]);

  return <>{children}</>;
}
