import type { TypedIO, TypedSocket } from './index.js';
import { roomPlayers, getPlayersInRoom } from './index.js';
import { PlayerState as PlayerStateModel } from '../models/PlayerState.js';
import type { PlayerState } from '@metaverse/shared';
import { MAP_DEFAULT_WIDTH, MAP_DEFAULT_HEIGHT, TILE_SIZE } from '@metaverse/shared';
import { Room } from '../models/Room.js';
import { SpaceMember } from '../models/SpaceMember.js';
import { leaveMediaRoom } from './webrtc.js';

export function registerRoomHandlers(io: TypedIO, socket: TypedSocket): void {
  socket.on('room:join', async ({ roomId }) => {
    try {
      if (!socket.userId || !socket.displayName) return;
      console.log(`[Room] ${socket.displayName} joining room ${roomId}`);

      const room = await Room.findById(roomId).select('spaceId maxOccupancy mapConfig');
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const membership = await SpaceMember.findOne({
        spaceId: room.spaceId,
        userId: socket.userId,
      }).select('_id');

      if (!membership) {
        socket.emit('error', { message: 'You are not a member of this space' });
        return;
      }

      const currentPlayers = roomPlayers.get(roomId);
      if (currentPlayers && currentPlayers.size >= room.maxOccupancy) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      // Leave previous room if any
      if (socket.currentRoomId) {
        await leaveMediaRoom(io, socket, socket.currentRoomId);
        const prevPlayers = roomPlayers.get(socket.currentRoomId);
        if (prevPlayers) {
          prevPlayers.delete(socket.userId);
          if (prevPlayers.size === 0) {
            roomPlayers.delete(socket.currentRoomId);
          }
        }
        socket.to(socket.currentRoomId).emit('player:left', { userId: socket.userId });
        socket.leave(socket.currentRoomId);
      }

      // Join new room
      socket.join(roomId);
      socket.currentRoomId = roomId;
      socket.currentSpaceId = room.spaceId.toString();

      const spawnTile = room.mapConfig.spawn ?? {
        x: Math.floor((room.mapConfig.width || MAP_DEFAULT_WIDTH) / 2),
        y: Math.floor((room.mapConfig.height || MAP_DEFAULT_HEIGHT) / 2),
      };
      const spawnX = spawnTile.x * TILE_SIZE + TILE_SIZE / 2;
      const spawnY = spawnTile.y * TILE_SIZE + TILE_SIZE / 2;

      const playerState: PlayerState = {
        userId: socket.userId,
        x: spawnX,
        y: spawnY,
        direction: 'down',
        displayName: socket.displayName,
        avatarIndex: socket.avatarIndex ?? 0,
        isSitting: false,
      };

      if (!roomPlayers.has(roomId)) {
        roomPlayers.set(roomId, new Map());
      }
      roomPlayers.get(roomId)!.set(socket.userId, playerState);

      await PlayerStateModel.findOneAndUpdate(
        { userId: socket.userId },
        {
          roomId,
          spaceId: socket.currentSpaceId,
          position: { x: spawnX, y: spawnY },
          direction: 'down',
          isMoving: false,
          isSitting: false,
          socketId: socket.id,
        },
        { upsert: true }
      );

      const existingPlayers = getPlayersInRoom(roomId);
      console.log(`[Room] Sending ${existingPlayers.length} players to ${socket.displayName}`);
      socket.emit('room:players', existingPlayers);

      socket.to(roomId).emit('player:joined', playerState);
    } catch (err) {
      console.error('[Room] Error in room:join:', err);
    }
  });

  socket.on('room:leave', async ({ roomId }) => {
    if (!socket.userId) return;
    await leaveMediaRoom(io, socket, roomId);

    const players = roomPlayers.get(roomId);
    if (players) {
      players.delete(socket.userId);
      if (players.size === 0) {
        roomPlayers.delete(roomId);
      }
    }

    socket.to(roomId).emit('player:left', { userId: socket.userId });
    socket.leave(roomId);
    socket.currentRoomId = undefined;

    await PlayerStateModel.findOneAndDelete({ userId: socket.userId });
  });
}
