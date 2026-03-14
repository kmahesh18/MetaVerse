import type { TypedIO, TypedSocket } from './index.js';
import { RoomObject } from '../models/RoomObject.js';

export function registerInteractionHandlers(io: TypedIO, socket: TypedSocket): void {
  socket.on('interaction:use', async ({ objectId }) => {
    if (!socket.userId || !socket.currentRoomId) return;

    try {
      const obj = await RoomObject.findById(objectId);
      if (!obj || !obj.isInteractive) {
        socket.emit('error', { message: 'Object not interactive' });
        return;
      }

      const data: Record<string, unknown> = {
        interactionType: obj.interactionType,
        ...((obj.interactionData as Record<string, unknown>) || {}),
      };

      socket.emit('interaction:result', { objectId, data });
    } catch {
      socket.emit('error', { message: 'Interaction failed' });
    }
  });
}
