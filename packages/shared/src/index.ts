// Types
export type { IUser, UserPublic, AvatarConfig, UserPreferences } from './types/user.js';
export { UserStatus } from './types/user.js';
export type { UserStatusType } from './types/user.js';

export type {
  ISpace,
  ISpaceMember,
  SpaceSettings,
  SpacePermissions,
  RoomBlueprintInput,
} from './types/space.js';
export { SpaceVisibility } from './types/space.js';
export type { SpaceVisibilityType } from './types/space.js';

export type { IRoom, IRoomObject, MapConfig, InteractionData } from './types/room.js';
export { RoomType, InteractionType } from './types/room.js';
export type { RoomTypeValue, InteractionTypeValue } from './types/room.js';

export type { IAsset, IAvatar, SpriteSheet, AvatarFrameConfig, AnimationFrames } from './types/asset.js';
export { AssetCategory } from './types/asset.js';
export type { AssetCategoryType } from './types/asset.js';

export type { IMessage, MessageAttachment } from './types/message.js';
export { MessageType, AttachmentType } from './types/message.js';
export type { MessageTypeValue } from './types/message.js';

export type { ITask, TaskComment } from './types/task.js';
export { TaskStatus, TaskPriority } from './types/task.js';
export type { TaskStatusType, TaskPriorityType } from './types/task.js';

export type { IInvitation, InvitationNotificationPayload } from './types/invitation.js';
export { InvitationStatus } from './types/invitation.js';
export type { InvitationStatusType } from './types/invitation.js';

export type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerState,
  ChatMessagePayload,
  MediaParticipant,
} from './types/socket-events.js';
export { Direction } from './types/socket-events.js';
export type { DirectionType } from './types/socket-events.js';

export type { ICEServer, ICEConfig } from './types/webrtc.js';
export type { RTCSessionDescriptionInit, RTCIceCandidateInit } from './types/socket-events.js';

export type {
  CuratedWorldAsset,
  WorldRenderable,
  FrameRenderable,
  ImageRenderable,
  AssetFootprint,
  RoomSummaryDefinition,
  RoomTemplateKeyType,
} from './world/curated-world.js';
export {
  CURATED_WORLD_ASSETS,
  CURATED_WORLD_ASSET_MAP,
  CURATED_ROOM_TEMPLATES,
  RoomTemplateKey,
  WorldSheetKey,
  WorldAssetRenderKind,
} from './world/curated-world.js';

// Constants
export * from './constants/index.js';
