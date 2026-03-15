import type { TypedIO, TypedSocket } from './index.js';
import { roomPlayers } from './index.js';
import { Message } from '../models/Message.js';
import { SpaceMember } from '../models/SpaceMember.js';
import { CHAT_MAX_LENGTH, PROXIMITY_RADIUS, TILE_SIZE } from '@metaverse/shared';
import type { ChatMessagePayload } from '@metaverse/shared';

export function registerChatHandlers(io: TypedIO, socket: TypedSocket): void {
  socket.on('chat:room', async ({ roomId, content }) => {
    if (!socket.userId || !socket.displayName) return;
    const trimmed = content.slice(0, CHAT_MAX_LENGTH);

    const message = await Message.create({
      type: 'room',
      senderId: socket.userId,
      roomId,
      content: trimmed,
    });

    const payload: ChatMessagePayload = {
      type: 'room',
      senderId: socket.userId,
      senderName: socket.displayName,
      content: trimmed,
      roomId,
      timestamp: message.createdAt.toISOString(),
    };

    io.to(roomId).emit('chat:message', payload);
  });

  socket.on('chat:dm', async ({ recipientId, content }) => {
    if (!socket.userId || !socket.displayName) return;
    const trimmed = content.slice(0, CHAT_MAX_LENGTH);

    const message = await Message.create({
      type: 'direct',
      senderId: socket.userId,
      recipientId,
      content: trimmed,
    });

    const payload: ChatMessagePayload = {
      type: 'direct',
      senderId: socket.userId,
      senderName: socket.displayName,
      content: trimmed,
      timestamp: message.createdAt.toISOString(),
    };

    // Send to recipient's socket
    const recipientSockets = await io.fetchSockets();
    for (const s of recipientSockets) {
      if ((s as unknown as TypedSocket).userId === recipientId) {
        s.emit('chat:message', payload);
      }
    }

    // Also send back to sender
    socket.emit('chat:message', payload);
  });

  socket.on('chat:broadcast', async ({ spaceId, content }) => {
    if (!socket.userId || !socket.displayName) return;

    // Check broadcast permission
    const member = await SpaceMember.findOne({
      spaceId,
      userId: socket.userId,
    });

    if (!member) return;
    if (
      member.role !== 'owner' &&
      member.role !== 'admin' &&
      !member.permissions.canBroadcast
    ) {
      socket.emit('error', { message: 'No broadcast permission' });
      return;
    }

    const trimmed = content.slice(0, CHAT_MAX_LENGTH);
    const message = await Message.create({
      type: 'broadcast',
      senderId: socket.userId,
      spaceId,
      content: trimmed,
    });

    const payload: ChatMessagePayload = {
      type: 'broadcast',
      senderId: socket.userId,
      senderName: socket.displayName,
      content: trimmed,
      spaceId,
      timestamp: message.createdAt.toISOString(),
    };

    // Broadcast to all connected sockets (space-wide channel)
    io.emit('chat:message', payload);
  });

  socket.on('chat:proximity', async ({ content, range }) => {
    if (!socket.userId || !socket.displayName || !socket.currentRoomId) return;
    const trimmed = content.slice(0, CHAT_MAX_LENGTH);

    // Use sender-specified range (in tiles), clamped 1–10, default PROXIMITY_RADIUS
    const rangeTiles = Math.min(10, Math.max(1, range ?? PROXIMITY_RADIUS));
    const rangePx = rangeTiles * TILE_SIZE;

    const players = roomPlayers.get(socket.currentRoomId);
    const senderState = players?.get(socket.userId);
    if (!senderState) return;

    const payload: ChatMessagePayload = {
      type: 'proximity',
      senderId: socket.userId,
      senderName: socket.displayName,
      content: trimmed,
      roomId: socket.currentRoomId,
      timestamp: new Date().toISOString(),
    };

    // Send to sender always
    socket.emit('chat:message', payload);

    // Send only to players within the specified proximity range
    if (!players) return;
    const allSockets = await io.fetchSockets();
    for (const [otherId, otherState] of players) {
      if (otherId === socket.userId) continue;
      const dx = Math.abs(senderState.x - otherState.x);
      const dy = Math.abs(senderState.y - otherState.y);
      if (dx <= rangePx && dy <= rangePx) {
        for (const s of allSockets) {
          if ((s as unknown as TypedSocket).userId === otherId) {
            s.emit('chat:message', payload);
          }
        }
      }
    }
  });
}

