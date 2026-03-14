import type { MediaParticipant } from '@metaverse/shared';
import type { TypedIO, TypedSocket } from './index.js';

const roomMediaParticipants = new Map<string, Map<string, MediaParticipant>>();

function mediaSocketRoom(roomId: string) {
  return `media:${roomId}`;
}

async function emitToUser(io: TypedIO, userId: string, event: string, payload: unknown) {
  const sockets = await io.fetchSockets();
  for (const socket of sockets) {
    if ((socket as unknown as TypedSocket).userId === userId) {
      ((((socket as unknown) as TypedSocket).emit) as (...args: unknown[]) => void)(event, payload);
    }
  }
}

export async function leaveMediaRoom(io: TypedIO, socket: TypedSocket, roomId?: string) {
  const activeRoomId = roomId ?? socket.currentMediaRoomId;
  if (!socket.userId || !activeRoomId) return;

  const participants = roomMediaParticipants.get(activeRoomId);
  if (!participants?.has(socket.userId)) {
    socket.currentMediaRoomId = undefined;
    socket.leave(mediaSocketRoom(activeRoomId));
    return;
  }

  participants.delete(socket.userId);
  socket.leave(mediaSocketRoom(activeRoomId));
  socket.currentMediaRoomId = undefined;

  (socket.to(mediaSocketRoom(activeRoomId)).emit as (...args: unknown[]) => void)('media:participant-left', {
    roomId: activeRoomId,
    userId: socket.userId,
  });

  if (participants.size === 0) {
    roomMediaParticipants.delete(activeRoomId);
  }
}

export function registerWebRTCHandlers(io: TypedIO, socket: TypedSocket): void {
  socket.on('media:room-join' as never, async ({ roomId }: { roomId: string }) => {
    if (!socket.userId || !socket.displayName || socket.currentRoomId !== roomId) {
      socket.emit('error', { message: 'Join the room before joining its call' });
      return;
    }

    if (socket.currentMediaRoomId && socket.currentMediaRoomId !== roomId) {
      await leaveMediaRoom(io, socket, socket.currentMediaRoomId);
    }

    const participant: MediaParticipant = {
      userId: socket.userId,
      displayName: socket.displayName,
      avatarIndex: socket.avatarIndex ?? 0,
      roomId,
      joinedAt: new Date().toISOString(),
    };

    const roomParticipants = roomMediaParticipants.get(roomId) ?? new Map<string, MediaParticipant>();
    roomParticipants.set(socket.userId, participant);
    roomMediaParticipants.set(roomId, roomParticipants);

    socket.join(mediaSocketRoom(roomId));
    socket.currentMediaRoomId = roomId;

    (socket.emit as (...args: unknown[]) => void)('media:room-participants', {
      roomId,
      participants: Array.from(roomParticipants.values()),
    });
    (socket.to(mediaSocketRoom(roomId)).emit as (...args: unknown[]) => void)('media:participant-joined', {
      roomId,
      participant,
    });
  });

  socket.on('media:room-leave' as never, async ({ roomId }: { roomId: string }) => {
    await leaveMediaRoom(io, socket, roomId);
  });

  socket.on('webrtc:call-start', async ({ targetUserId }) => {
    if (!socket.userId) return;
    await emitToUser(io, targetUserId, 'webrtc:call-start', {
      fromUserId: socket.userId,
    });
  });

  socket.on('webrtc:offer', async ({ targetUserId, offer }) => {
    if (!socket.userId) return;
    await emitToUser(io, targetUserId, 'webrtc:offer', {
      fromUserId: socket.userId,
      offer,
    });
  });

  socket.on('webrtc:answer', async ({ targetUserId, answer }) => {
    if (!socket.userId) return;
    await emitToUser(io, targetUserId, 'webrtc:answer', {
      fromUserId: socket.userId,
      answer,
    });
  });

  socket.on('webrtc:ice-candidate', async ({ targetUserId, candidate }) => {
    if (!socket.userId) return;
    await emitToUser(io, targetUserId, 'webrtc:ice-candidate', {
      fromUserId: socket.userId,
      candidate,
    });
  });

  socket.on('webrtc:call-end', async ({ targetUserId }) => {
    if (!socket.userId) return;
    await emitToUser(io, targetUserId, 'webrtc:call-end', {
      fromUserId: socket.userId,
    });
  });

  socket.on('disconnect', async () => {
    await leaveMediaRoom(io, socket);
  });
}
