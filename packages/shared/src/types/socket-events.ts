import type { InvitationNotificationPayload } from './invitation.js';

export const Direction = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
} as const;

export type DirectionType = (typeof Direction)[keyof typeof Direction];

// ── Client → Server Events ──

export interface ClientToServerEvents {
  'room:join': (data: { roomId: string }) => void;
  'room:leave': (data: { roomId: string }) => void;

  'player:move': (data: { x: number; y: number; direction: DirectionType }) => void;
  'player:stop': (data: { x: number; y: number; direction: DirectionType }) => void;
  'player:sit': (data: { objectId: string }) => void;
  'player:stand': () => void;

  'chat:room': (data: { roomId: string; content: string }) => void;
  'chat:dm': (data: { recipientId: string; content: string }) => void;
  'chat:broadcast': (data: { spaceId: string; content: string }) => void;
  'chat:proximity': (data: { content: string }) => void;

  'webrtc:offer': (data: { targetUserId: string; offer: RTCSessionDescriptionInit }) => void;
  'webrtc:answer': (data: { targetUserId: string; answer: RTCSessionDescriptionInit }) => void;
  'webrtc:ice-candidate': (data: { targetUserId: string; candidate: RTCIceCandidateInit }) => void;
  'webrtc:call-start': (data: { targetUserId: string }) => void;
  'webrtc:call-end': (data: { targetUserId: string }) => void;
  'media:room-join': (data: { roomId: string }) => void;
  'media:room-leave': (data: { roomId: string }) => void;

  'interaction:use': (data: { objectId: string }) => void;
}

// ── Server → Client Events ──

export interface PlayerState {
  userId: string;
  x: number;
  y: number;
  direction: DirectionType;
  displayName: string;
  avatarIndex: number;
  isSitting?: boolean;
  seatedObjectId?: string;
}

export interface ChatMessagePayload {
  type: string;
  senderId: string;
  senderName: string;
  content: string;
  roomId?: string;
  spaceId?: string;
  timestamp: string;
}

export interface MediaParticipant {
  userId: string;
  displayName: string;
  avatarIndex: number;
  roomId: string;
  joinedAt: string;
}

export interface ServerToClientEvents {
  'room:players': (players: PlayerState[]) => void;
  'player:joined': (player: PlayerState) => void;
  'player:left': (data: { userId: string }) => void;
  'player:moved': (data: { userId: string; x: number; y: number; direction: DirectionType }) => void;
  'player:stopped': (data: { userId: string; x: number; y: number; direction: DirectionType }) => void;
  'player:sat': (data: { userId: string; objectId: string; direction: DirectionType }) => void;
  'player:stood': (data: { userId: string }) => void;

  'chat:message': (message: ChatMessagePayload) => void;

  'proximity:enter': (data: { userId: string; displayName: string }) => void;
  'proximity:leave': (data: { userId: string }) => void;

  'webrtc:offer': (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => void;
  'webrtc:answer': (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => void;
  'webrtc:ice-candidate': (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => void;
  'webrtc:call-start': (data: { fromUserId: string }) => void;
  'webrtc:call-end': (data: { fromUserId: string }) => void;
  'media:room-participants': (data: { roomId: string; participants: MediaParticipant[] }) => void;
  'media:participant-joined': (data: { roomId: string; participant: MediaParticipant }) => void;
  'media:participant-left': (data: { roomId: string; userId: string }) => void;

  'user:status': (data: { userId: string; status: string }) => void;
  'invitation:new': (data: InvitationNotificationPayload) => void;
  'invitation:count': (data: { count: number }) => void;

  'interaction:result': (data: { objectId: string; data: Record<string, unknown> }) => void;

  error: (data: { message: string }) => void;
}

// RTCSessionDescriptionInit/RTCIceCandidateInit are browser globals.
// For server-side, we use plain objects with matching shapes.
export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer';
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}
