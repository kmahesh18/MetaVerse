import type { TypedIO, TypedSocket } from './index.js';
import { roomPlayers } from './index.js';
import { PlayerState as PlayerStateModel } from '../models/PlayerState.js';

export function registerMovementHandlers(io: TypedIO, socket: TypedSocket): void {
  socket.on('player:move', async ({ x, y, direction }) => {
    if (!socket.userId || !socket.currentRoomId) return;

    // Update in-memory state
    const players = roomPlayers.get(socket.currentRoomId);
    if (players) {
      const state = players.get(socket.userId);
      if (state) {
        state.x = x;
        state.y = y;
        state.direction = direction;
        state.isSitting = false;
        state.seatedObjectId = undefined;
      }
    }

    // Broadcast to room
    socket.to(socket.currentRoomId).emit('player:moved', {
      userId: socket.userId,
      x,
      y,
      direction,
    });

    // Persist (throttled — the client only emits every MOVEMENT_EMIT_INTERVAL)
    await PlayerStateModel.findOneAndUpdate(
      { userId: socket.userId },
      {
        position: { x, y },
        direction,
        isMoving: true,
        isSitting: false,
      }
    );
  });

  socket.on('player:stop', async ({ x, y, direction }) => {
    if (!socket.userId || !socket.currentRoomId) return;

    const players = roomPlayers.get(socket.currentRoomId);
    if (players) {
      const state = players.get(socket.userId);
      if (state) {
        state.x = x;
        state.y = y;
        state.direction = direction;
        state.isSitting = false;
        state.seatedObjectId = undefined;
      }
    }

    socket.to(socket.currentRoomId).emit('player:stopped', {
      userId: socket.userId,
      x,
      y,
      direction,
    });

    await PlayerStateModel.findOneAndUpdate(
      { userId: socket.userId },
      {
        position: { x, y },
        direction,
        isMoving: false,
        isSitting: false,
      }
    );
  });

  socket.on('player:sit', async ({ objectId }) => {
    if (!socket.userId || !socket.currentRoomId) return;

    const players = roomPlayers.get(socket.currentRoomId);
    const state = players?.get(socket.userId);
    if (state) {
      state.isSitting = true;
      state.seatedObjectId = objectId;
    }

    socket.to(socket.currentRoomId).emit('player:sat', {
      userId: socket.userId,
      objectId,
      direction: state?.direction ?? 'down',
    });

    await PlayerStateModel.findOneAndUpdate(
      { userId: socket.userId },
      { isSitting: true }
    );
  });

  socket.on('player:stand', async () => {
    if (!socket.userId || !socket.currentRoomId) return;

    const players = roomPlayers.get(socket.currentRoomId);
    const state = players?.get(socket.userId);
    if (state) {
      state.isSitting = false;
      state.seatedObjectId = undefined;
    }

    socket.to(socket.currentRoomId).emit('player:stood', {
      userId: socket.userId,
    });

    await PlayerStateModel.findOneAndUpdate(
      { userId: socket.userId },
      { isSitting: false }
    );
  });
}
