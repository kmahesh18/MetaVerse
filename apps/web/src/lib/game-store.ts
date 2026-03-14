import { create } from 'zustand';
import type { PlayerState, ChatMessagePayload, DirectionType } from '@metaverse/shared';

interface RoomSummary {
  _id: string;
  name: string;
  type: string;
  templateKey?: string;
  order: number;
}

interface RoomWorldRoom {
  _id: string;
  spaceId: string;
  name: string;
  description?: string;
  type: string;
  templateKey?: string;
  mapConfig: {
    width: number;
    height: number;
    tileSize: number;
    backgroundTileId: string;
    collisionMap: number[][];
    spawn?: {
      x: number;
      y: number;
    };
  };
}

interface RoomWorldObject {
  _id: string;
  roomId: string;
  position: { x: number; y: number };
  rotation: number;
  zIndex: number;
  isObstacle: boolean;
  isInteractive: boolean;
  interactionType: string;
  interactionData?: {
    content?: string;
    targetRoomId?: string;
    targetTemplateKey?: string;
    mediaUrl?: string;
  };
  asset: {
    slug: string;
    name: string;
    category?: string;
    dimensions?: { widthTiles: number; heightTiles: number };
    tags?: string[];
  } | null;
}

interface ActiveInteraction {
  objectId?: string;
  title: string;
  body: string;
  kind: string;
}

interface GameState {
  // Room
  currentRoomId: string | null;
  currentSpaceId: string | null;
  room: RoomWorldRoom | null;
  roomObjects: RoomWorldObject[];
  connectedRooms: RoomSummary[];

  // Players
  players: Map<string, PlayerState>;
  localPlayer: PlayerState | null;

  // Chat
  messages: ChatMessagePayload[];
  proximityUsers: Set<string>;
  activeInteraction: ActiveInteraction | null;
  seatedObjectId: string | null;

  // UI
  isChatOpen: boolean;
  isVideoOpen: boolean;

  // Actions
  setRoom: (roomId: string | null, spaceId: string | null) => void;
  setWorld: (room: RoomWorldRoom, objects: RoomWorldObject[], connectedRooms: RoomSummary[]) => void;
  setLocalPlayer: (player: PlayerState) => void;
  updateLocalPosition: (x: number, y: number, direction: DirectionType) => void;
  setPlayers: (players: PlayerState[]) => void;
  addPlayer: (player: PlayerState) => void;
  removePlayer: (userId: string) => void;
  updatePlayer: (userId: string, data: Partial<PlayerState>) => void;
  addMessage: (message: ChatMessagePayload) => void;
  clearMessages: () => void;
  addProximityUser: (userId: string) => void;
  removeProximityUser: (userId: string) => void;
  setInteraction: (interaction: ActiveInteraction | null) => void;
  setSeatedObjectId: (objectId: string | null) => void;
  toggleChat: () => void;
  toggleVideo: () => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentRoomId: null,
  currentSpaceId: null,
  room: null,
  roomObjects: [],
  connectedRooms: [],
  players: new Map(),
  localPlayer: null,
  messages: [],
  proximityUsers: new Set(),
  activeInteraction: null,
  seatedObjectId: null,
  isChatOpen: true,
  isVideoOpen: false,

  setRoom: (roomId, spaceId) => set({ currentRoomId: roomId, currentSpaceId: spaceId }),

  setWorld: (room, objects, connectedRooms) =>
    set({
      room,
      roomObjects: objects,
      connectedRooms,
      currentRoomId: room._id,
      currentSpaceId: room.spaceId,
    }),

  setLocalPlayer: (player) => set({ localPlayer: player }),

  updateLocalPosition: (x, y, direction) => {
    const { localPlayer } = get();
    if (localPlayer) {
      set({ localPlayer: { ...localPlayer, x, y, direction } });
    }
  },

  setPlayers: (players) => {
    const map = new Map<string, PlayerState>();
    for (const p of players) map.set(p.userId, p);
    set({ players: map });
  },

  addPlayer: (player) => {
    const { players } = get();
    const next = new Map(players);
    next.set(player.userId, player);
    set({ players: next });
  },

  removePlayer: (userId) => {
    const { players } = get();
    const next = new Map(players);
    next.delete(userId);
    set({ players: next });
  },

  updatePlayer: (userId, data) => {
    const { players } = get();
    const existing = players.get(userId);
    if (!existing) return;
    const next = new Map(players);
    next.set(userId, { ...existing, ...data });
    set({ players: next });
  },

  addMessage: (message) => {
    set((s) => ({ messages: [...s.messages.slice(-199), message] }));
  },

  clearMessages: () => set({ messages: [] }),

  addProximityUser: (userId) => {
    const { proximityUsers } = get();
    const next = new Set(proximityUsers);
    next.add(userId);
    set({ proximityUsers: next });
  },

  removeProximityUser: (userId) => {
    const { proximityUsers } = get();
    const next = new Set(proximityUsers);
    next.delete(userId);
    set({ proximityUsers: next });
  },

  setInteraction: (interaction) => set({ activeInteraction: interaction }),
  setSeatedObjectId: (objectId) => set({ seatedObjectId: objectId }),

  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
  toggleVideo: () => set((s) => ({ isVideoOpen: !s.isVideoOpen })),

  reset: () =>
    set({
      currentRoomId: null,
      currentSpaceId: null,
      room: null,
      roomObjects: [],
      connectedRooms: [],
      players: new Map(),
      localPlayer: null,
      messages: [],
      proximityUsers: new Set(),
      activeInteraction: null,
      seatedObjectId: null,
      isChatOpen: true,
      isVideoOpen: false,
    }),
}));
