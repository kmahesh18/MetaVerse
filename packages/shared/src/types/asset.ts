export const AssetCategory = {
  TILE: 'tile',
  FURNITURE: 'furniture',
  DECORATION: 'decoration',
  NATURE: 'nature',
  TECH: 'tech',
  WALL: 'wall',
  CHARACTER: 'character',
  EFFECT: 'effect',
} as const;

export type AssetCategoryType = (typeof AssetCategory)[keyof typeof AssetCategory];

export interface SpriteSheet {
  url: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

export interface IAsset {
  _id: string;
  name: string;
  slug: string;
  category: AssetCategoryType;
  spriteSheet: SpriteSheet;
  thumbnailUrl?: string;
  dimensions: {
    widthTiles: number;
    heightTiles: number;
  };
  defaultObstacle: boolean;
  defaultInteractive: boolean;
  defaultInteraction: string;
  tags: string[];
  isSystem: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnimationFrames {
  start: number;
  end: number;
}

export interface AvatarFrameConfig {
  frameWidth: number;
  frameHeight: number;
  animations: {
    idleDown: AnimationFrames;
    idleUp: AnimationFrames;
    idleLeft: AnimationFrames;
    idleRight: AnimationFrames;
    walkDown: AnimationFrames;
    walkUp: AnimationFrames;
    walkLeft: AnimationFrames;
    walkRight: AnimationFrames;
    sit: AnimationFrames;
  };
}

export interface IAvatar {
  _id: string;
  name: string;
  spriteSheetUrl: string;
  frameConfig: AvatarFrameConfig;
  isDefault: boolean;
  createdAt: Date;
}
