import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@metaverse/shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket | null {
  return socket;
}

export function connectSocket(token: string): TypedSocket {
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  }) as TypedSocket;

  socket.on('connect', () => {
    console.log('[socket] connected:', socket?.id);
  });

  socket.onAny((event, ...args) => {
    console.log('[socket] event:', event, args);
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
  });

  socket.on('error', (data) => {
    console.error('[socket] error:', data.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
