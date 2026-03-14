import type { DirectionType } from '@metaverse/shared';

export interface DirectionFrameRange {
  start: number;
  end: number;
}

export interface CharacterAnimationManifest {
  idle: Record<DirectionType, number>;
  walk: Record<DirectionType, DirectionFrameRange>;
  sit: Record<DirectionType, DirectionFrameRange>;
}

// Verified against the checked-in sprite sheets:
// idle = [left, up, right, down]
// walk/sit = [left(0-5), up(6-11), right(12-17), down(18-23)]
export const DEFAULT_CHARACTER_MANIFEST: CharacterAnimationManifest = {
  idle: {
    left: 0,
    up: 1,
    right: 2,
    down: 3,
  },
  walk: {
    left: { start: 0, end: 5 },
    up: { start: 6, end: 11 },
    right: { start: 12, end: 17 },
    down: { start: 18, end: 23 },
  },
  sit: {
    left: { start: 0, end: 5 },
    up: { start: 6, end: 11 },
    right: { start: 12, end: 17 },
    down: { start: 18, end: 23 },
  },
};
