import type { AssetDocument } from '../models/Asset.js';
import { Asset } from '../models/Asset.js';
import type { RoomDocument } from '../models/Room.js';
import { Room } from '../models/Room.js';
import { RoomObject } from '../models/RoomObject.js';
import {
  CURATED_ROOM_TEMPLATES,
  CURATED_WORLD_ASSET_MAP,
  CURATED_WORLD_ASSETS,
  InteractionType,
  RoomTemplateKey,
  TILE_SIZE,
  WorldSheetKey,
  type CuratedWorldAsset,
  type InteractionData,
  type InteractionTypeValue,
  type RoomSummaryDefinition,
  type RoomTemplateKeyType,
} from '@metaverse/shared';
import type { RoomBlueprintInput } from '@metaverse/shared';

const SHEET_URLS = {
  [WorldSheetKey.ROOM_BUILDER]: '/assets/tiles/room_builder.png',
  [WorldSheetKey.INTERIORS]: '/assets/tiles/interiors.png',
  [WorldSheetKey.TINY_TOWN]: '/assets/tiles/tiny_town.png',
  [WorldSheetKey.TINY_DUNGEON]: '/assets/tiles/tiny_dungeon.png',
} as const;

interface TemplateObjectSpec {
  assetSlug: string;
  x: number;
  y: number;
  rotation?: number;
  zIndex?: number;
  isObstacle?: boolean;
  isInteractive?: boolean;
  interactionType?: InteractionTypeValue;
  interactionData?: InteractionData;
}

interface PortalAnchorConfig {
  hubSlots: Array<{ x: number; y: number }>;
  returnSlot: { x: number; y: number };
}

function resolveSpriteUrl(asset: CuratedWorldAsset): string {
  const primary = asset.renderables[0];
  if (!primary) return '';
  if (primary.kind === 'image') return primary.src;
  return SHEET_URLS[primary.sheet];
}

export async function ensureCuratedAssets(): Promise<Map<string, AssetDocument>> {
  const slugs = CURATED_WORLD_ASSETS.map((asset: CuratedWorldAsset) => asset.slug);
  const existing = await Asset.find({ slug: { $in: slugs } }).select('_id slug');
  const existingSlugs = new Set(existing.map((asset) => asset.slug));

  const missing = CURATED_WORLD_ASSETS.filter(
    (asset: CuratedWorldAsset) => !existingSlugs.has(asset.slug)
  );
  if (missing.length > 0) {
    await Asset.insertMany(
      missing.map((asset: CuratedWorldAsset) => ({
        name: asset.name,
        slug: asset.slug,
        category: asset.category,
        spriteSheet: {
          url: resolveSpriteUrl(asset),
          frameWidth: asset.renderables[0]?.kind === 'image' ? asset.renderables[0].width : 16,
          frameHeight: asset.renderables[0]?.kind === 'image' ? asset.renderables[0].height : 16,
          frameCount: asset.renderables.length,
        },
        thumbnailUrl: resolveSpriteUrl(asset),
        dimensions: asset.dimensions,
        defaultObstacle: asset.defaultObstacle,
        defaultInteractive: asset.defaultInteractive,
        defaultInteraction: asset.defaultInteraction,
        tags: asset.styleTags,
        isSystem: true,
      })),
      { ordered: false }
    ).catch(() => {
      // Ignore duplicate system asset writes when rooms are created concurrently.
    });
  }

  const assets = await Asset.find({ slug: { $in: slugs } });
  return new Map(assets.map((asset) => [asset.slug, asset]));
}

function buildCollisionMap(
  width: number,
  height: number,
  objects: TemplateObjectSpec[]
): number[][] {
  const map = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));

  for (const object of objects) {
    const asset = CURATED_WORLD_ASSET_MAP[object.assetSlug];
    if (!asset) continue;

    const shouldBlock = object.isObstacle ?? asset.defaultObstacle;
    if (!shouldBlock) continue;

    const footprint = asset.obstacleFootprint ?? {
      x: 0,
      y: 0,
      widthTiles: asset.dimensions.widthTiles,
      heightTiles: asset.dimensions.heightTiles,
    };

    for (let ty = object.y + footprint.y; ty < object.y + footprint.y + footprint.heightTiles; ty += 1) {
      for (let tx = object.x + footprint.x; tx < object.x + footprint.x + footprint.widthTiles; tx += 1) {
        if (tx >= 0 && ty >= 0 && tx < width && ty < height) {
          map[ty][tx] = 1;
        }
      }
    }
  }

  return map;
}

function lobbyObjects(): TemplateObjectSpec[] {
  return [
    { assetSlug: 'gallery-panel', x: 17, y: 1 },
    {
      assetSlug: 'bookcase-wall',
      x: 6,
      y: 2,
      isInteractive: true,
      interactionType: InteractionType.READ,
      interactionData: { content: 'Welcome guide and space culture notes.' },
    },
    {
      assetSlug: 'notice-board',
      x: 12,
      y: 1,
      interactionData: { content: 'Daily announcements and community highlights.' },
    },
    {
      assetSlug: 'reception-counter',
      x: 16,
      y: 3,
      interactionData: { content: 'Welcome to your friendly office world.' },
    },
    {
      assetSlug: 'reception-counter',
      x: 18,
      y: 3,
      interactionData: {
        content: 'Ask for a room recommendation or jump into your next activity.',
      },
    },
    {
      assetSlug: 'coffee-bar',
      x: 29,
      y: 4,
      interactionData: { content: 'Coffee, tea, and a quick status sync live here.' },
    },
    {
      assetSlug: 'water-cooler',
      x: 31,
      y: 4,
      interactionData: { content: 'Grab a drink and chat with whoever is nearby.' },
    },
    {
      assetSlug: 'task-kiosk-blue',
      x: 33,
      y: 5,
      interactionData: { content: 'Quick task queue: catch up, plan, and ship.' },
    },
    { assetSlug: 'planter-box', x: 3, y: 3 },
    { assetSlug: 'planter-box-alt', x: 34, y: 3 },
    { assetSlug: 'planter-box', x: 3, y: 19 },
    { assetSlug: 'planter-box-alt', x: 34, y: 19 },
    { assetSlug: 'large-potted-tree', x: 2, y: 10 },
    { assetSlug: 'large-potted-tree', x: 35, y: 10 },
    { assetSlug: 'floor-lamp', x: 5, y: 5 },
    { assetSlug: 'floor-lamp', x: 28, y: 5 },
    { assetSlug: 'warm-rug', x: 5, y: 7 },
    {
      assetSlug: 'waiting-sofa',
      x: 6,
      y: 8,
      interactionData: { content: 'Settle in before heading deeper into the office.' },
    },
    {
      assetSlug: 'office-chair',
      x: 10,
      y: 8,
      interactionData: { content: 'A quick seat while you figure out where to go next.' },
    },
    { assetSlug: 'warm-rug', x: 24, y: 7 },
    {
      assetSlug: 'waiting-sofa',
      x: 24,
      y: 8,
      interactionData: { content: 'This corner is for casual hellos and quick resets.' },
    },
    {
      assetSlug: 'office-chair',
      x: 23,
      y: 8,
      interactionData: { content: 'Pull up a chair and say hello.' },
    },
    { assetSlug: 'filing-cabinet', x: 3, y: 14 },
    { assetSlug: 'filing-cabinet', x: 34, y: 14 },
  ];
}

function officeObjects(): TemplateObjectSpec[] {
  return [
    {
      assetSlug: 'bookcase-wall',
      x: 2,
      y: 4,
      interactionData: { content: 'Reading shelf with playbooks and design references.' },
    },
    {
      assetSlug: 'notice-board',
      x: 10,
      y: 2,
      interactionData: { content: 'Sprint goals and weekly milestones.' },
    },
    { assetSlug: 'storage-wall', x: 2, y: 10 },
    { assetSlug: 'office-desk-pod', x: 7, y: 5 },
    { assetSlug: 'office-chair', x: 8, y: 7, interactionData: { content: 'Your workstation awaits.' } },
    { assetSlug: 'office-desk-pod', x: 14, y: 5 },
    { assetSlug: 'office-chair', x: 15, y: 7, interactionData: { content: 'Settle in for focused work.' } },
    { assetSlug: 'office-desk-pod', x: 26, y: 5 },
    { assetSlug: 'office-chair', x: 27, y: 7, interactionData: { content: 'Deep work station.' } },
    { assetSlug: 'office-desk-pod', x: 33, y: 5 },
    { assetSlug: 'office-chair', x: 34, y: 7, interactionData: { content: 'Corner desk vibes.' } },
    { assetSlug: 'office-desk-pod', x: 7, y: 13 },
    { assetSlug: 'office-chair', x: 8, y: 15, interactionData: { content: 'Pair programming spot.' } },
    { assetSlug: 'office-desk-pod', x: 14, y: 13 },
    { assetSlug: 'office-chair', x: 15, y: 15, interactionData: { content: 'Code review station.' } },
    {
      assetSlug: 'reading-desk',
      x: 26,
      y: 13,
      interactionData: { content: 'Technical documentation and research papers. Take your time.' },
    },
    {
      assetSlug: 'whiteboard-wall',
      x: 20,
      y: 2,
      interactionData: { content: 'Today: focus, pairing, and async updates before lunch.' },
    },
    { assetSlug: 'water-cooler', x: 24, y: 3, interactionData: { content: 'Hydrate and sync up informally.' } },
    { assetSlug: 'filing-cabinet', x: 37, y: 4 },
    { assetSlug: 'filing-cabinet', x: 38, y: 4 },
    { assetSlug: 'floor-lamp', x: 6, y: 10 },
    { assetSlug: 'floor-lamp', x: 25, y: 10 },
    { assetSlug: 'large-potted-tree', x: 20, y: 10 },
    { assetSlug: 'green-rug', x: 25, y: 15 },
    { assetSlug: 'green-rug', x: 31, y: 15 },
    {
      assetSlug: 'modern-bench',
      x: 27,
      y: 18,
      interactionData: { content: 'A quick recharge bench by the windows.' },
    },
    { assetSlug: 'coffee-bar', x: 37, y: 17, interactionData: { content: 'Afternoon refuel zone.' } },
    {
      assetSlug: 'task-kiosk-blue',
      x: 34,
      y: 18,
      interactionData: { content: 'Sprint board shortcut: pick a task and ship something.' },
    },
    { assetSlug: 'planter-box', x: 3, y: 20 },
    { assetSlug: 'planter-box-alt', x: 39, y: 20 },
    { assetSlug: 'planter-box', x: 39, y: 3 },
    { assetSlug: 'server-rack', x: 40, y: 8, interactionData: { content: 'Server status: all systems nominal. Deploy with confidence.' } },
  ];
}

function meetingObjects(): TemplateObjectSpec[] {
  return [
    { assetSlug: 'gallery-panel', x: 14, y: 1 },
    {
      assetSlug: 'whiteboard-wall',
      x: 9,
      y: 2,
      interactionData: { content: 'Team sync board: goals, blockers, and next experiments.' },
    },
    {
      assetSlug: 'notice-board',
      x: 5,
      y: 2,
      interactionData: { content: 'Meeting agenda and action items from last session.' },
    },
    { assetSlug: 'coffee-bar', x: 25, y: 3, interactionData: { content: 'Meeting fuel and water station.' } },
    { assetSlug: 'water-cooler', x: 27, y: 3, interactionData: { content: 'Stay hydrated during long sessions.' } },
    { assetSlug: 'meeting-table', x: 12, y: 7, interactionData: { content: 'Stand-up cluster A.' } },
    { assetSlug: 'meeting-table', x: 14, y: 7, interactionData: { content: 'Stand-up cluster B.' } },
    { assetSlug: 'meeting-table', x: 12, y: 9, interactionData: { content: 'Planning cluster C.' } },
    { assetSlug: 'meeting-table', x: 14, y: 9, interactionData: { content: 'Planning cluster D.' } },
    { assetSlug: 'office-chair', x: 11, y: 8, interactionData: { content: 'Take a seat for the standup.' } },
    { assetSlug: 'office-chair', x: 16, y: 8, interactionData: { content: 'Pull up a chair for discussion.' } },
    { assetSlug: 'office-chair', x: 11, y: 10, interactionData: { content: 'Planning seat.' } },
    { assetSlug: 'office-chair', x: 16, y: 10, interactionData: { content: 'Review seat.' } },
    {
      assetSlug: 'waiting-sofa',
      x: 5,
      y: 14,
      interactionData: { content: 'Quiet observation spot for review sessions.' },
    },
    {
      assetSlug: 'waiting-sofa',
      x: 24,
      y: 14,
      interactionData: { content: 'Use this zone for one-on-ones after the main session.' },
    },
    {
      assetSlug: 'task-kiosk-red',
      x: 27,
      y: 15,
      interactionData: { content: 'Launch a poll, retro, or quick voting round.' },
    },
    { assetSlug: 'planter-box', x: 3, y: 3 },
    { assetSlug: 'planter-box-alt', x: 28, y: 3 },
    { assetSlug: 'floor-lamp', x: 4, y: 6 },
    { assetSlug: 'floor-lamp', x: 27, y: 6 },
    { assetSlug: 'large-potted-tree', x: 3, y: 12 },
  ];
}

function loungeObjects(): TemplateObjectSpec[] {
  return [
    { assetSlug: 'warm-rug', x: 5, y: 7 },
    {
      assetSlug: 'waiting-sofa',
      x: 5,
      y: 8,
      interactionData: { content: 'Casual catch-up corner.' },
    },
    { assetSlug: 'office-chair', x: 9, y: 8, interactionData: { content: 'Chill spot for informal chats.' } },
    { assetSlug: 'warm-rug', x: 20, y: 7 },
    {
      assetSlug: 'waiting-sofa',
      x: 20,
      y: 8,
      interactionData: { content: 'Team wins, demos, and coffee chats happen here.' },
    },
    { assetSlug: 'office-chair', x: 19, y: 8, interactionData: { content: 'Grab a seat for the demo.' } },
    {
      assetSlug: 'coffee-table',
      x: 14,
      y: 9,
      interactionData: { content: 'Leave meeting notes or a quick celebration message.' },
    },
    {
      assetSlug: 'modern-bench',
      x: 13,
      y: 14,
      interactionData: { content: 'A modern perch for a quick reset.' },
    },
    {
      assetSlug: 'coffee-bar',
      x: 25,
      y: 4,
      interactionData: { content: 'Coffee, snacks, and social recharge.' },
    },
    { assetSlug: 'water-cooler', x: 27, y: 4, interactionData: { content: 'Water cooler conversations start here.' } },
    {
      assetSlug: 'notice-board',
      x: 12,
      y: 2,
      interactionData: { content: 'Fun facts, team shoutouts, and upcoming events.' },
    },
    {
      assetSlug: 'arcade-kiosk',
      x: 28,
      y: 14,
      interactionData: { content: 'A light game break keeps the room playful.' },
    },
    {
      assetSlug: 'task-kiosk-blue',
      x: 30,
      y: 14,
      interactionData: { content: 'Try a mini challenge or pull a lightweight task.' },
    },
    {
      assetSlug: 'bookcase-wall',
      x: 4,
      y: 16,
      interactionData: { content: 'Reference books, comics, and team artifacts.' },
    },
    { assetSlug: 'planter-box', x: 3, y: 3 },
    { assetSlug: 'planter-box-alt', x: 29, y: 17 },
    { assetSlug: 'floor-lamp', x: 4, y: 5 },
    { assetSlug: 'floor-lamp', x: 29, y: 5 },
    { assetSlug: 'large-potted-tree', x: 3, y: 11 },
    { assetSlug: 'large-potted-tree', x: 29, y: 11 },
  ];
}

function gardenObjects(): TemplateObjectSpec[] {
  return [
    { assetSlug: 'garden-tree-pine', x: 2, y: 2 },
    { assetSlug: 'garden-tree-round', x: 32, y: 2 },
    { assetSlug: 'garden-tree-round', x: 2, y: 15 },
    { assetSlug: 'garden-tree-pine', x: 32, y: 15 },
    { assetSlug: 'bush-green', x: 8, y: 5 },
    { assetSlug: 'bush-blue', x: 28, y: 5 },
    { assetSlug: 'bush-green', x: 8, y: 18 },
    { assetSlug: 'bush-blue', x: 28, y: 18 },
    {
      assetSlug: 'modern-bench',
      x: 11,
      y: 14,
      interactionData: { content: 'Outdoor bench for relaxed proximity chats.' },
    },
    {
      assetSlug: 'modern-bench',
      x: 25,
      y: 14,
      interactionData: { content: 'A second bench keeps the terrace social.' },
    },
    {
      assetSlug: 'coffee-table',
      x: 18,
      y: 11,
      interactionData: { content: 'Plant a note here before heading back inside.' },
    },
    {
      assetSlug: 'task-kiosk-red',
      x: 29,
      y: 12,
      interactionData: { content: 'Garden challenge board: light social prompts and async tasks.' },
    },
  ];
}

function libraryObjects(): TemplateObjectSpec[] {
  return [
    {
      assetSlug: 'bookcase-wall',
      x: 4,
      y: 3,
      interactionData: { content: 'Design books and shipping notes.' },
    },
    {
      assetSlug: 'bookcase-wall',
      x: 20,
      y: 3,
      interactionData: { content: 'Quiet references and team reading list.' },
    },
    { assetSlug: 'storage-wall', x: 4, y: 15 },
    { assetSlug: 'storage-wall', x: 20, y: 15 },
    { assetSlug: 'office-desk-pod', x: 12, y: 8 },
    { assetSlug: 'office-chair', x: 13, y: 10, interactionData: { content: 'Quiet reading chair.' } },
    {
      assetSlug: 'reading-desk',
      x: 7,
      y: 8,
      interactionData: { content: 'Research papers and technical articles. Settle in for a deep read.' },
    },
    { assetSlug: 'office-chair', x: 8, y: 9, interactionData: { content: 'Study seat with desk lamp light.' } },
    {
      assetSlug: 'reading-desk',
      x: 22,
      y: 8,
      interactionData: { content: 'Architecture documents and system design references.' },
    },
    { assetSlug: 'office-chair', x: 23, y: 9, interactionData: { content: 'Reference desk seat.' } },
    {
      assetSlug: 'waiting-sofa',
      x: 10,
      y: 13,
      interactionData: { content: 'Low-noise reading nook.' },
    },
    { assetSlug: 'green-rug', x: 10, y: 14 },
    {
      assetSlug: 'whiteboard-wall',
      x: 12,
      y: 2,
      interactionData: { content: 'Ideas worth revisiting later live here.' },
    },
    { assetSlug: 'planter-box', x: 3, y: 3 },
    { assetSlug: 'planter-box-alt', x: 28, y: 3 },
    { assetSlug: 'floor-lamp', x: 6, y: 7 },
    { assetSlug: 'floor-lamp', x: 21, y: 7 },
    { assetSlug: 'floor-lamp', x: 27, y: 12 },
    { assetSlug: 'large-potted-tree', x: 3, y: 9 },
    { assetSlug: 'large-potted-tree', x: 28, y: 9 },
    {
      assetSlug: 'task-kiosk-blue',
      x: 26,
      y: 10,
      interactionData: { content: 'Focus board: pick a deep-work task and disappear for 25 minutes.' },
    },
  ];
}

const TEMPLATE_OBJECTS: Record<RoomTemplateKeyType, TemplateObjectSpec[]> = {
  [RoomTemplateKey.FRIENDLY_LOBBY]: lobbyObjects(),
  [RoomTemplateKey.OPEN_OFFICE]: officeObjects(),
  [RoomTemplateKey.MEETING_STUDIO]: meetingObjects(),
  [RoomTemplateKey.PLAY_LOUNGE]: loungeObjects(),
  [RoomTemplateKey.GARDEN_TERRACE]: gardenObjects(),
  [RoomTemplateKey.FOCUS_LIBRARY]: libraryObjects(),
};

const PORTAL_ANCHORS: Record<RoomTemplateKeyType, PortalAnchorConfig> = {
  [RoomTemplateKey.FRIENDLY_LOBBY]: {
    hubSlots: [
      { x: 6, y: 17 },
      { x: 10, y: 17 },
      { x: 14, y: 17 },
      { x: 18, y: 17 },
      { x: 22, y: 17 },
      { x: 26, y: 17 },
      { x: 30, y: 17 },
    ],
    returnSlot: { x: 18, y: 17 },
  },
  [RoomTemplateKey.OPEN_OFFICE]: {
    hubSlots: [
      { x: 6, y: 19 },
      { x: 10, y: 19 },
      { x: 14, y: 19 },
      { x: 18, y: 19 },
      { x: 22, y: 19 },
      { x: 26, y: 19 },
      { x: 30, y: 19 },
    ],
    returnSlot: { x: 21, y: 20 },
  },
  [RoomTemplateKey.MEETING_STUDIO]: {
    hubSlots: [
      { x: 8, y: 16 },
      { x: 11, y: 16 },
      { x: 14, y: 16 },
      { x: 17, y: 16 },
      { x: 20, y: 16 },
      { x: 23, y: 16 },
      { x: 26, y: 16 },
    ],
    returnSlot: { x: 15, y: 17 },
  },
  [RoomTemplateKey.PLAY_LOUNGE]: {
    hubSlots: [
      { x: 7, y: 18 },
      { x: 10, y: 18 },
      { x: 13, y: 18 },
      { x: 16, y: 18 },
      { x: 19, y: 18 },
      { x: 22, y: 18 },
      { x: 25, y: 18 },
    ],
    returnSlot: { x: 16, y: 18 },
  },
  [RoomTemplateKey.GARDEN_TERRACE]: {
    hubSlots: [
      { x: 8, y: 18 },
      { x: 11, y: 18 },
      { x: 14, y: 18 },
      { x: 17, y: 18 },
      { x: 20, y: 18 },
      { x: 23, y: 18 },
      { x: 26, y: 18 },
    ],
    returnSlot: { x: 19, y: 18 },
  },
  [RoomTemplateKey.FOCUS_LIBRARY]: {
    hubSlots: [
      { x: 6, y: 17 },
      { x: 9, y: 17 },
      { x: 12, y: 17 },
      { x: 15, y: 17 },
      { x: 18, y: 17 },
      { x: 21, y: 17 },
      { x: 24, y: 17 },
    ],
    returnSlot: { x: 15, y: 17 },
  },
};

function getTemplateDefinition(templateKey: RoomTemplateKeyType): RoomSummaryDefinition {
  const template = CURATED_ROOM_TEMPLATES.find((entry) => entry.key === templateKey);
  if (!template) {
    throw new Error(`Unknown room template: ${templateKey}`);
  }
  return template;
}

function normalizeBlueprints(blueprints: RoomBlueprintInput[]): RoomBlueprintInput[] {
  const fallback = CURATED_ROOM_TEMPLATES[0];
  const normalized = blueprints
    .slice(0, 8)
    .map((blueprint, index) => ({
      templateKey:
        CURATED_ROOM_TEMPLATES.find((template) => template.key === blueprint.templateKey)?.key ??
        fallback.key,
      name: blueprint.name.trim() || `${fallback.name} ${index + 1}`,
      isDefault: blueprint.isDefault === true,
    }));

  if (normalized.length === 0) {
    return [
      { templateKey: fallback.key, name: fallback.name, isDefault: true },
    ];
  }

  if (!normalized.some((blueprint) => blueprint.isDefault)) {
    normalized[0] = { ...normalized[0], isDefault: true };
  }

  return normalized;
}

function buildObjectDocs(
  roomId: string,
  ownerId: string,
  objects: TemplateObjectSpec[],
  assetMap: Map<string, AssetDocument>
) {
  return objects.flatMap((object) => {
    const asset = assetMap.get(object.assetSlug);
    if (!asset) return [];

    const assetDef = CURATED_WORLD_ASSET_MAP[object.assetSlug];
    return [
      {
        roomId,
        assetId: asset._id,
        position: {
          x: object.x * TILE_SIZE,
          y: object.y * TILE_SIZE,
        },
        rotation: object.rotation ?? 0,
        zIndex: object.zIndex ?? 0,
        isObstacle: object.isObstacle ?? assetDef.defaultObstacle,
        isInteractive: object.isInteractive ?? assetDef.defaultInteractive,
        interactionType: object.interactionType ?? assetDef.defaultInteraction,
        interactionData: object.interactionData ?? {},
        placedBy: ownerId,
      },
    ];
  });
}

async function createTemplateRoomInternal(
  spaceId: string,
  ownerId: string,
  blueprint: RoomBlueprintInput,
  order: number,
  assetMap: Map<string, AssetDocument>
) {
  const templateKey = blueprint.templateKey as RoomTemplateKeyType;
  const template = getTemplateDefinition(templateKey);
  const objects = TEMPLATE_OBJECTS[template.key];
  const collisionMap = buildCollisionMap(template.width, template.height, objects);

  const room = await Room.create({
    spaceId,
    name: blueprint.name,
    description: template.description,
    type: template.roomType,
    templateKey: template.key,
    mapConfig: {
      width: template.width,
      height: template.height,
      tileSize: TILE_SIZE,
      backgroundTileId: template.floorTheme,
      collisionMap,
      spawn: template.spawn,
    },
    maxOccupancy: 20,
    order,
  });

  const docs = buildObjectDocs(room._id.toString(), ownerId, objects, assetMap);
  if (docs.length > 0) {
    await RoomObject.insertMany(docs);
  }

  return room;
}

export async function syncSpaceTeleports(
  spaceId: string,
  ownerId: string,
  defaultRoomId?: string
): Promise<string> {
  const assetMap = await ensureCuratedAssets();
  const portalAsset = assetMap.get('portal-sign');
  const rooms = await Room.find({ spaceId }).sort({ order: 1 });
  if (!portalAsset || rooms.length === 0) {
    return defaultRoomId ?? '';
  }

  const roomIds = rooms.map((room) => room._id);
  await RoomObject.deleteMany({
    roomId: { $in: roomIds },
    interactionType: InteractionType.TELEPORT,
    assetId: portalAsset._id,
  });

  const defaultRoom =
    rooms.find((room) => room._id.toString() === defaultRoomId) ??
    rooms[0];
  const otherRooms = rooms.filter((room) => room._id.toString() !== defaultRoom._id.toString());

  if (otherRooms.length === 0) {
    return defaultRoom._id.toString();
  }

  const hubAnchor = PORTAL_ANCHORS[(defaultRoom.templateKey as RoomTemplateKeyType) ?? RoomTemplateKey.FRIENDLY_LOBBY];
  const docs = otherRooms.flatMap((room, index) => {
    const portalDefs: Array<{
      roomId: string;
      assetId: unknown;
      position: { x: number; y: number };
      rotation: number;
      zIndex: number;
      isObstacle: boolean;
      isInteractive: boolean;
      interactionType: string;
      interactionData: InteractionData;
      placedBy: string;
    }> = [];

    const hubSlot = hubAnchor.hubSlots[index];
    if (hubSlot) {
      portalDefs.push({
        roomId: defaultRoom._id.toString(),
        assetId: portalAsset._id,
        position: { x: hubSlot.x * TILE_SIZE, y: hubSlot.y * TILE_SIZE },
        rotation: 0,
        zIndex: 5,
        isObstacle: false,
        isInteractive: true,
        interactionType: InteractionType.TELEPORT,
        interactionData: {
          content: room.name,
          targetRoomId: room._id.toString(),
        },
        placedBy: ownerId,
      });
    }

    const returnAnchor =
      PORTAL_ANCHORS[(room.templateKey as RoomTemplateKeyType) ?? RoomTemplateKey.FRIENDLY_LOBBY];
    portalDefs.push({
      roomId: room._id.toString(),
      assetId: portalAsset._id,
      position: {
        x: returnAnchor.returnSlot.x * TILE_SIZE,
        y: returnAnchor.returnSlot.y * TILE_SIZE,
      },
      rotation: 0,
      zIndex: 5,
      isObstacle: false,
      isInteractive: true,
      interactionType: InteractionType.TELEPORT,
      interactionData: {
        content: `Back to ${defaultRoom.name}`,
        targetRoomId: defaultRoom._id.toString(),
      },
      placedBy: ownerId,
    });

    return portalDefs;
  });

  if (docs.length > 0) {
    await RoomObject.insertMany(docs);
  }

  return defaultRoom._id.toString();
}

export async function createCuratedRoomsFromBlueprints(
  spaceId: string,
  ownerId: string,
  blueprints: RoomBlueprintInput[]
): Promise<string> {
  const assetMap = await ensureCuratedAssets();
  const normalizedBlueprints = normalizeBlueprints(blueprints);
  const roomDocs: RoomDocument[] = [];

  for (const [index, blueprint] of normalizedBlueprints.entries()) {
    const room = await createTemplateRoomInternal(spaceId, ownerId, blueprint, index, assetMap);
    roomDocs.push(room);
  }

  const defaultRoomId =
    roomDocs[normalizedBlueprints.findIndex((blueprint) => blueprint.isDefault)]?._id.toString() ??
    roomDocs[0]?._id.toString() ??
    '';

  return syncSpaceTeleports(spaceId, ownerId, defaultRoomId);
}

export async function createTemplateRoom(
  spaceId: string,
  ownerId: string,
  blueprint: RoomBlueprintInput
): Promise<RoomDocument> {
  const assetMap = await ensureCuratedAssets();
  const normalized = normalizeBlueprints([blueprint])[0];
  const order = await Room.countDocuments({ spaceId });
  return createTemplateRoomInternal(spaceId, ownerId, normalized, order, assetMap);
}

export async function regenerateRoomFromTemplate(
  room: RoomDocument,
  ownerId: string,
  templateKey: RoomTemplateKeyType,
  nextValues?: {
    name?: string;
    isLocked?: boolean;
    maxOccupancy?: number;
    order?: number;
  }
): Promise<RoomDocument> {
  const template = getTemplateDefinition(templateKey);
  const assetMap = await ensureCuratedAssets();
  const objects = TEMPLATE_OBJECTS[template.key];
  const collisionMap = buildCollisionMap(template.width, template.height, objects);

  room.name = nextValues?.name?.trim() || room.name;
  room.type = template.roomType;
  room.templateKey = template.key;
  room.description = template.description;
  room.mapConfig = {
    width: template.width,
    height: template.height,
    tileSize: TILE_SIZE,
    backgroundTileId: template.floorTheme,
    collisionMap,
    spawn: template.spawn,
  };
  if (typeof nextValues?.isLocked === 'boolean') {
    room.isLocked = nextValues.isLocked;
  }
  if (typeof nextValues?.maxOccupancy === 'number') {
    room.maxOccupancy = nextValues.maxOccupancy;
  }
  if (typeof nextValues?.order === 'number') {
    room.order = nextValues.order;
  }
  await room.save();

  await RoomObject.deleteMany({ roomId: room._id });
  const docs = buildObjectDocs(room._id.toString(), ownerId, objects, assetMap);
  if (docs.length > 0) {
    await RoomObject.insertMany(docs);
  }

  return room;
}
