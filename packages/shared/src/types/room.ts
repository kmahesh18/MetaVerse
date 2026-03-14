export const RoomType = {
  LOBBY: 'lobby',
  OFFICE: 'office',
  MEETING: 'meeting',
  LOUNGE: 'lounge',
  GARDEN: 'garden',
  LIBRARY: 'library',
  CUSTOM: 'custom',
} as const;

export type RoomTypeValue = (typeof RoomType)[keyof typeof RoomType];

export const InteractionType = {
  NONE: 'none',
  SIT: 'sit',
  READ: 'read',
  USE: 'use',
  TELEPORT: 'teleport',
  WHITEBOARD: 'whiteboard',
} as const;

export type InteractionTypeValue = (typeof InteractionType)[keyof typeof InteractionType];

export interface MapConfig {
  width: number;
  height: number;
  tileSize: number;
  backgroundTileId: string;
  collisionMap: number[][];
  spawn?: {
    x: number;
    y: number;
  };
}

export interface IRoom {
  _id: string;
  spaceId: string;
  name: string;
  description?: string;
  type: RoomTypeValue;
  templateKey?: string;
  mapConfig: MapConfig;
  maxOccupancy: number;
  isLocked: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionData {
  content?: string;
  targetRoomId?: string;
  targetTemplateKey?: string;
  mediaUrl?: string;
}

export interface IRoomObject {
  _id: string;
  roomId: string;
  assetId: string;
  position: { x: number; y: number };
  rotation: number;
  zIndex: number;
  isObstacle: boolean;
  isInteractive: boolean;
  interactionType: InteractionTypeValue;
  interactionData?: InteractionData;
  placedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
