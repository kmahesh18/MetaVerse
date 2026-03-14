import type { TypedIO, TypedSocket } from './index.js';
import { roomPlayers } from './index.js';
import { PROXIMITY_RADIUS, TILE_SIZE } from '@metaverse/shared';

const PROXIMITY_RADIUS_PX = PROXIMITY_RADIUS * TILE_SIZE;

// Track which users are in proximity of each other
const proximityPairs = new Map<string, Set<string>>();

function getProximityKey(userId: string): string {
  return `prox:${userId}`;
}

export function registerProximityHandlers(io: TypedIO, socket: TypedSocket): void {
  // Check proximity on each movement
  const checkInterval = setInterval(() => {
    if (!socket.userId || !socket.currentRoomId) return;

    const players = roomPlayers.get(socket.currentRoomId);
    if (!players) return;

    const myState = players.get(socket.userId);
    if (!myState) return;

    const key = getProximityKey(socket.userId);
    if (!proximityPairs.has(key)) {
      proximityPairs.set(key, new Set());
    }
    const myProximity = proximityPairs.get(key)!;

    for (const [otherId, otherState] of players) {
      if (otherId === socket.userId) continue;

      const dx = Math.abs(myState.x - otherState.x);
      const dy = Math.abs(myState.y - otherState.y);
      const isNear = dx <= PROXIMITY_RADIUS_PX && dy <= PROXIMITY_RADIUS_PX;

      const wasNear = myProximity.has(otherId);

      if (isNear && !wasNear) {
        myProximity.add(otherId);
        socket.emit('proximity:enter', {
          userId: otherId,
          displayName: otherState.displayName,
        });
      } else if (!isNear && wasNear) {
        myProximity.delete(otherId);
        socket.emit('proximity:leave', { userId: otherId });
      }
    }
  }, 500);

  socket.on('disconnect', () => {
    clearInterval(checkInterval);
    if (socket.userId) {
      proximityPairs.delete(getProximityKey(socket.userId));
    }
  });
}
