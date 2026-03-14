import { AssetCategory } from '../types/asset.js';
import type { AssetCategoryType } from '../types/asset.js';
import { InteractionType, RoomType } from '../types/room.js';
import type { InteractionTypeValue, RoomTypeValue } from '../types/room.js';

export const WorldSheetKey = {
  ROOM_BUILDER: 'room_builder',
  INTERIORS: 'interiors',
  TINY_TOWN: 'tiny_town',
  TINY_DUNGEON: 'tiny_dungeon',
} as const;

export type WorldSheetKeyType = (typeof WorldSheetKey)[keyof typeof WorldSheetKey];

export const WorldAssetRenderKind = {
  FRAME: 'frame',
  IMAGE: 'image',
} as const;

export type WorldAssetRenderKindType =
  (typeof WorldAssetRenderKind)[keyof typeof WorldAssetRenderKind];

export const RoomTemplateKey = {
  FRIENDLY_LOBBY: 'friendly-lobby',
  OPEN_OFFICE: 'open-office',
  MEETING_STUDIO: 'meeting-studio',
  PLAY_LOUNGE: 'play-lounge',
  GARDEN_TERRACE: 'garden-terrace',
  FOCUS_LIBRARY: 'focus-library',
} as const;

export type RoomTemplateKeyType =
  (typeof RoomTemplateKey)[keyof typeof RoomTemplateKey];

export interface AssetFootprint {
  x: number;
  y: number;
  widthTiles: number;
  heightTiles: number;
}

export interface FrameRenderable {
  kind: 'frame';
  sheet: WorldSheetKeyType;
  frame: number;
  offsetX: number;
  offsetY: number;
  depthOffset?: number;
}

export interface ImageRenderable {
  kind: 'image';
  key: string;
  src: string;
  width: number;
  height: number;
  originX: number;
  originY: number;
  offsetX?: number;
  offsetY?: number;
  depthOffset?: number;
}

export type WorldRenderable = FrameRenderable | ImageRenderable;

export interface CuratedWorldAsset {
  key: string;
  slug: string;
  name: string;
  category: AssetCategoryType;
  dimensions: {
    widthTiles: number;
    heightTiles: number;
  };
  obstacleFootprint?: AssetFootprint;
  defaultObstacle: boolean;
  defaultInteractive: boolean;
  defaultInteraction: InteractionTypeValue;
  styleTags: string[];
  renderables: WorldRenderable[];
}

export interface RoomSummaryDefinition {
  key: RoomTemplateKeyType;
  name: string;
  description: string;
  roomType: RoomTypeValue;
  width: number;
  height: number;
  floorTheme: string;
  spawn: {
    x: number;
    y: number;
  };
}

export const CURATED_WORLD_ASSETS: readonly CuratedWorldAsset[] = [
  {
    key: 'office-desk-pod',
    slug: 'office-desk-pod',
    name: 'Office Desk Pod',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 3, heightTiles: 2 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 3, heightTiles: 2 },
    defaultObstacle: true,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['office', 'workstation', 'warm'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 256, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 257, offsetX: 16, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 258, offsetX: 32, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 272, offsetX: 0, offsetY: 16 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 273, offsetX: 16, offsetY: 16 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 274, offsetX: 32, offsetY: 16 },
    ],
  },
  {
    key: 'reception-counter',
    slug: 'reception-counter',
    name: 'Reception Counter',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 2, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 2, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.USE,
    styleTags: ['office', 'reception', 'welcome'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 261, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 262, offsetX: 16, offsetY: 0 },
    ],
  },
  {
    key: 'meeting-table',
    slug: 'meeting-table',
    name: 'Meeting Table',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 2, heightTiles: 2 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 2, heightTiles: 2 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.USE,
    styleTags: ['meeting', 'collaboration', 'office'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 304, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 305, offsetX: 16, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 320, offsetX: 0, offsetY: 16 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 321, offsetX: 16, offsetY: 16 },
    ],
  },
  {
    key: 'waiting-sofa',
    slug: 'waiting-sofa',
    name: 'Waiting Sofa',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 3, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 3, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.SIT,
    styleTags: ['lounge', 'seat', 'soft'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 312, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 313, offsetX: 16, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 314, offsetX: 32, offsetY: 0 },
    ],
  },
  {
    key: 'warm-rug',
    slug: 'warm-rug',
    name: 'Warm Rug',
    category: AssetCategory.DECORATION,
    dimensions: { widthTiles: 3, heightTiles: 1 },
    defaultObstacle: false,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['lounge', 'warm', 'soft'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 296, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 297, offsetX: 16, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 298, offsetX: 32, offsetY: 0 },
    ],
  },
  {
    key: 'green-rug',
    slug: 'green-rug',
    name: 'Green Rug',
    category: AssetCategory.DECORATION,
    dimensions: { widthTiles: 2, heightTiles: 1 },
    defaultObstacle: false,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['office', 'green', 'accent'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 299, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 300, offsetX: 16, offsetY: 0 },
    ],
  },
  {
    key: 'whiteboard-wall',
    slug: 'whiteboard-wall',
    name: 'Whiteboard Wall',
    category: AssetCategory.TECH,
    dimensions: { widthTiles: 4, heightTiles: 1 },
    defaultObstacle: false,
    defaultInteractive: true,
    defaultInteraction: InteractionType.WHITEBOARD,
    styleTags: ['meeting', 'planning', 'task'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 290, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 291, offsetX: 16, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 292, offsetX: 32, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 293, offsetX: 48, offsetY: 0 },
    ],
  },
  {
    key: 'bookcase-wall',
    slug: 'bookcase-wall',
    name: 'Bookcase Wall',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 4, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 4, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.READ,
    styleTags: ['library', 'books', 'office'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 500, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 501, offsetX: 16, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 502, offsetX: 32, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 503, offsetX: 48, offsetY: 0 },
    ],
  },
  {
    key: 'storage-wall',
    slug: 'storage-wall',
    name: 'Storage Wall',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 4, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 4, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['office', 'storage', 'quiet'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 516, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 517, offsetX: 16, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 518, offsetX: 32, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 519, offsetX: 48, offsetY: 0 },
    ],
  },
  {
    key: 'coffee-bar',
    slug: 'coffee-bar',
    name: 'Coffee Bar',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 2, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 2, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.USE,
    styleTags: ['lounge', 'coffee', 'social'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 338, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 339, offsetX: 16, offsetY: 0 },
    ],
  },
  {
    key: 'gallery-panel',
    slug: 'gallery-panel',
    name: 'Gallery Panel',
    category: AssetCategory.DECORATION,
    dimensions: { widthTiles: 2, heightTiles: 1 },
    defaultObstacle: false,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['branding', 'wall', 'warm'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 331, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 332, offsetX: 16, offsetY: 0 },
    ],
  },
  {
    key: 'planter-box',
    slug: 'planter-box',
    name: 'Planter Box',
    category: AssetCategory.NATURE,
    dimensions: { widthTiles: 1, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 1, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['green', 'office', 'nature'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 528, offsetX: 0, offsetY: 0 },
    ],
  },
  {
    key: 'planter-box-alt',
    slug: 'planter-box-alt',
    name: 'Planter Box Alt',
    category: AssetCategory.NATURE,
    dimensions: { widthTiles: 1, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 1, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['green', 'office', 'nature'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 529, offsetX: 0, offsetY: 0 },
    ],
  },
  {
    key: 'portal-sign',
    slug: 'portal-sign',
    name: 'Portal Sign',
    category: AssetCategory.TECH,
    dimensions: { widthTiles: 1, heightTiles: 1 },
    defaultObstacle: false,
    defaultInteractive: true,
    defaultInteraction: InteractionType.TELEPORT,
    styleTags: ['transition', 'navigation', 'friendly'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.TINY_TOWN, frame: 83, offsetX: 0, offsetY: 0 },
    ],
  },
  {
    key: 'arcade-kiosk',
    slug: 'arcade-kiosk',
    name: 'Arcade Kiosk',
    category: AssetCategory.TECH,
    dimensions: { widthTiles: 1, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 1, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.USE,
    styleTags: ['game', 'play', 'kiosk'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.TINY_DUNGEON, frame: 92, offsetX: 0, offsetY: 0 },
    ],
  },
  {
    key: 'modern-bench',
    slug: 'modern-bench',
    name: 'Modern Bench',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 4, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 4, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.SIT,
    styleTags: ['modern', 'bench', 'seat'],
    renderables: [
      {
        kind: 'image',
        key: 'modern_bench',
        src: '/assets/world/modern-bench.png',
        width: 64,
        height: 24,
        originX: 0,
        originY: 0,
      },
    ],
  },
  {
    key: 'task-kiosk-blue',
    slug: 'task-kiosk-blue',
    name: 'Blue Task Kiosk',
    category: AssetCategory.TECH,
    dimensions: { widthTiles: 1, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 1, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.USE,
    styleTags: ['task', 'tech', 'game'],
    renderables: [
      {
        kind: 'image',
        key: 'task_kiosk_blue',
        src: '/assets/world/task-kiosk-blue.png',
        width: 127,
        height: 123,
        originX: 0.5,
        originY: 1,
      },
    ],
  },
  {
    key: 'task-kiosk-red',
    slug: 'task-kiosk-red',
    name: 'Red Task Kiosk',
    category: AssetCategory.TECH,
    dimensions: { widthTiles: 1, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 1, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.USE,
    styleTags: ['task', 'tech', 'game'],
    renderables: [
      {
        kind: 'image',
        key: 'task_kiosk_red',
        src: '/assets/world/task-kiosk-red.png',
        width: 127,
        height: 122,
        originX: 0.5,
        originY: 1,
      },
    ],
  },
  {
    key: 'coffee-table',
    slug: 'coffee-table',
    name: 'Coffee Table',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 3, heightTiles: 3 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 3, heightTiles: 3 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.USE,
    styleTags: ['lounge', 'table', 'social'],
    renderables: [
      {
        kind: 'image',
        key: 'coffee_table',
        src: '/assets/world/coffee-table.png',
        width: 52,
        height: 56,
        originX: 0,
        originY: 0,
      },
    ],
  },
  {
    key: 'garden-tree-pine',
    slug: 'garden-tree-pine',
    name: 'Garden Tree Pine',
    category: AssetCategory.NATURE,
    dimensions: { widthTiles: 4, heightTiles: 5 },
    obstacleFootprint: { x: 1, y: 3, widthTiles: 2, heightTiles: 2 },
    defaultObstacle: true,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['garden', 'tree', 'nature'],
    renderables: [
      {
        kind: 'image',
        key: 'tree_pine',
        src: '/assets/world/tree-pine.png',
        width: 96,
        height: 124,
        originX: 0,
        originY: 0,
      },
    ],
  },
  {
    key: 'garden-tree-round',
    slug: 'garden-tree-round',
    name: 'Garden Tree Round',
    category: AssetCategory.NATURE,
    dimensions: { widthTiles: 4, heightTiles: 5 },
    obstacleFootprint: { x: 1, y: 3, widthTiles: 2, heightTiles: 2 },
    defaultObstacle: true,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['garden', 'tree', 'nature'],
    renderables: [
      {
        kind: 'image',
        key: 'tree_round',
        src: '/assets/world/tree-round.png',
        width: 96,
        height: 104,
        originX: 0,
        originY: 0,
      },
    ],
  },
  {
    key: 'bush-green',
    slug: 'bush-green',
    name: 'Green Bush',
    category: AssetCategory.NATURE,
    dimensions: { widthTiles: 3, heightTiles: 2 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 3, heightTiles: 2 },
    defaultObstacle: true,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['garden', 'bush', 'nature'],
    renderables: [
      {
        kind: 'image',
        key: 'bush_green',
        src: '/assets/world/bush-green.png',
        width: 56,
        height: 44,
        originX: 0,
        originY: 0,
      },
    ],
  },
  {
    key: 'bush-blue',
    slug: 'bush-blue',
    name: 'Blue Bush',
    category: AssetCategory.NATURE,
    dimensions: { widthTiles: 3, heightTiles: 2 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 3, heightTiles: 2 },
    defaultObstacle: true,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['garden', 'bush', 'nature'],
    renderables: [
      {
        kind: 'image',
        key: 'bush_blue',
        src: '/assets/world/bush-blue.png',
        width: 56,
        height: 44,
        originX: 0,
        originY: 0,
      },
    ],
  },
  // ── New Interactive & Obstacle Assets ──
  {
    key: 'reading-desk',
    slug: 'reading-desk',
    name: 'Reading Desk',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 2, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 2, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.READ,
    styleTags: ['office', 'desk', 'reading', 'focus'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 260, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 261, offsetX: 16, offsetY: 0 },
    ],
  },
  {
    key: 'office-chair',
    slug: 'office-chair',
    name: 'Office Chair',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 1, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 1, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.SIT,
    styleTags: ['office', 'seat', 'work'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 336, offsetX: 0, offsetY: 0 },
    ],
  },
  {
    key: 'notice-board',
    slug: 'notice-board',
    name: 'Notice Board',
    category: AssetCategory.DECORATION,
    dimensions: { widthTiles: 2, heightTiles: 1 },
    defaultObstacle: false,
    defaultInteractive: true,
    defaultInteraction: InteractionType.READ,
    styleTags: ['office', 'wall', 'announcement', 'info'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 288, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 289, offsetX: 16, offsetY: 0 },
    ],
  },
  {
    key: 'water-cooler',
    slug: 'water-cooler',
    name: 'Water Cooler',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 1, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 1, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.USE,
    styleTags: ['social', 'lounge', 'water', 'break'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 340, offsetX: 0, offsetY: 0 },
    ],
  },
  {
    key: 'filing-cabinet',
    slug: 'filing-cabinet',
    name: 'Filing Cabinet',
    category: AssetCategory.FURNITURE,
    dimensions: { widthTiles: 1, heightTiles: 1 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 1, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['office', 'storage', 'obstacle'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 530, offsetX: 0, offsetY: 0 },
    ],
  },
  {
    key: 'floor-lamp',
    slug: 'floor-lamp',
    name: 'Floor Lamp',
    category: AssetCategory.DECORATION,
    dimensions: { widthTiles: 1, heightTiles: 1 },
    defaultObstacle: false,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['decoration', 'light', 'warm'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 352, offsetX: 0, offsetY: 0 },
    ],
  },
  {
    key: 'large-potted-tree',
    slug: 'large-potted-tree',
    name: 'Large Potted Tree',
    category: AssetCategory.NATURE,
    dimensions: { widthTiles: 1, heightTiles: 2 },
    obstacleFootprint: { x: 0, y: 1, widthTiles: 1, heightTiles: 1 },
    defaultObstacle: true,
    defaultInteractive: false,
    defaultInteraction: InteractionType.NONE,
    styleTags: ['nature', 'green', 'decoration'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 512, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 528, offsetX: 0, offsetY: 16 },
    ],
  },
  {
    key: 'server-rack',
    slug: 'server-rack',
    name: 'Server Rack',
    category: AssetCategory.TECH,
    dimensions: { widthTiles: 1, heightTiles: 2 },
    obstacleFootprint: { x: 0, y: 0, widthTiles: 1, heightTiles: 2 },
    defaultObstacle: true,
    defaultInteractive: true,
    defaultInteraction: InteractionType.USE,
    styleTags: ['tech', 'server', 'office'],
    renderables: [
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 356, offsetX: 0, offsetY: 0 },
      { kind: 'frame', sheet: WorldSheetKey.INTERIORS, frame: 372, offsetX: 0, offsetY: 16 },
    ],
  },
] as const;

export const CURATED_WORLD_ASSET_MAP = Object.fromEntries(
  CURATED_WORLD_ASSETS.map((asset) => [asset.slug, asset])
) as Record<string, CuratedWorldAsset>;

export const CURATED_ROOM_TEMPLATES: readonly RoomSummaryDefinition[] = [
  {
    key: RoomTemplateKey.FRIENDLY_LOBBY,
    name: 'Welcome Lobby',
    description: 'Warm reception and social landing zone for the whole space.',
    roomType: RoomType.LOBBY,
    width: 38,
    height: 24,
    floorTheme: 'warm-lobby',
    spawn: { x: 18, y: 18 },
  },
  {
    key: RoomTemplateKey.OPEN_OFFICE,
    name: 'Open Office',
    description: 'Shared desks, quiet corners, and healthy circulation.',
    roomType: RoomType.OFFICE,
    width: 44,
    height: 24,
    floorTheme: 'sunlit-office',
    spawn: { x: 21, y: 18 },
  },
  {
    key: RoomTemplateKey.MEETING_STUDIO,
    name: 'Meeting Studio',
    description: 'Camera-friendly planning room with a central collaboration zone.',
    roomType: RoomType.MEETING,
    width: 32,
    height: 20,
    floorTheme: 'calm-meeting',
    spawn: { x: 15, y: 14 },
  },
  {
    key: RoomTemplateKey.PLAY_LOUNGE,
    name: 'Play Lounge',
    description: 'Breakout room with coffee, couches, and light game energy.',
    roomType: RoomType.LOUNGE,
    width: 34,
    height: 22,
    floorTheme: 'play-lounge',
    spawn: { x: 16, y: 16 },
  },
  {
    key: RoomTemplateKey.GARDEN_TERRACE,
    name: 'Garden Terrace',
    description: 'Outdoor breathing room for low-noise chats and relaxed calls.',
    roomType: RoomType.GARDEN,
    width: 40,
    height: 24,
    floorTheme: 'garden-terrace',
    spawn: { x: 20, y: 18 },
  },
  {
    key: RoomTemplateKey.FOCUS_LIBRARY,
    name: 'Focus Library',
    description: 'Quiet reading and focus space with books and low visual noise.',
    roomType: RoomType.LIBRARY,
    width: 32,
    height: 20,
    floorTheme: 'focus-library',
    spawn: { x: 15, y: 15 },
  },
] as const;
