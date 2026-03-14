import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerState,
} from '@metaverse/shared';
import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { PlayerState as PlayerStateModel } from '../models/PlayerState.js';
import { Invitation } from '../models/Invitation.js';
import { registerMovementHandlers } from './movement.js';
import { registerChatHandlers } from './chat.js';
import { registerRoomHandlers } from './room.js';
import { registerWebRTCHandlers } from './webrtc.js';
import { registerInteractionHandlers } from './interaction.js';
import { registerProximityHandlers } from './proximity.js';

export type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  userId?: string;
  userEmail?: string;
  displayName?: string;
  avatarIndex?: number;
  currentRoomId?: string;
  currentSpaceId?: string;
  currentMediaRoomId?: string;
};

// In-memory store for player positions (room → userId → PlayerState)
export const roomPlayers = new Map<string, Map<string, PlayerState>>();

export function getPlayersInRoom(roomId: string): PlayerState[] {
  const players = roomPlayers.get(roomId);
  if (!players) return [];
  return Array.from(players.values());
}

export function setupSocketIO(io: TypedIO): void {
  // JWT authentication middleware
  io.use(async (socket: TypedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.userId).select('email displayName avatarConfig');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = payload.userId;
      socket.userEmail = user.email;
      socket.displayName = user.displayName;
      socket.avatarIndex = user.avatarConfig?.spriteIndex ?? 0;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as TypedSocket;
    console.log(`[Socket] Connected: ${socket.userId} (${socket.displayName})`);

    // Register all handlers FIRST (before any async work to avoid race conditions)
    registerRoomHandlers(io, socket);
    registerMovementHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerProximityHandlers(io, socket);
    registerWebRTCHandlers(io, socket);
    registerInteractionHandlers(io, socket);

    // Update user status to online (fire-and-forget)
    if (socket.userId) {
      User.findByIdAndUpdate(socket.userId, { status: 'online' }).catch(() => {});
    }

    if (socket.userEmail) {
      Invitation.countDocuments({
        inviteeEmail: socket.userEmail,
        status: 'pending',
      })
        .then((count) => {
          (socket.emit as (...args: unknown[]) => void)('invitation:count', { count });
        })
        .catch(() => {});
    }

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${socket.userId}`);

      // Remove from current room
      if (socket.currentRoomId && socket.userId) {
        const players = roomPlayers.get(socket.currentRoomId);
        if (players) {
          players.delete(socket.userId);
          if (players.size === 0) {
            roomPlayers.delete(socket.currentRoomId);
          }
        }

        socket.to(socket.currentRoomId).emit('player:left', { userId: socket.userId });

        // Clean up persistent state
        await PlayerStateModel.findOneAndDelete({ userId: socket.userId });
      }

      // Update user status
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, {
          status: 'offline',
          lastSeen: new Date(),
        });
      }
    });
  });
}
