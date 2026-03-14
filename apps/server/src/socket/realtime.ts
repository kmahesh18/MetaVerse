import type { ClientToServerEvents, ServerToClientEvents } from '@metaverse/shared';
import type { Server } from 'socket.io';
import type { TypedSocket } from './index.js';

let ioRef: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export function setRealtimeIO(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  ioRef = io;
}

export function getRealtimeIO() {
  return ioRef;
}

export async function emitToUser<EventName extends keyof ServerToClientEvents>(
  userId: string,
  event: EventName,
  payload: Parameters<ServerToClientEvents[EventName]>[0]
) {
  if (!ioRef) return;

  const sockets = await ioRef.fetchSockets();
  for (const socket of sockets) {
    if ((socket as unknown as TypedSocket).userId === userId) {
      (((socket as unknown) as TypedSocket).emit as (...args: unknown[]) => void)(event, payload);
    }
  }
}
