// Types
export type { IUser, UserPublic, AvatarConfig, UserPreferences } from './types/user';
export { UserStatus } from './types/user';
export type { UserStatusType } from './types/user';

export type {
  ISpace,
  ISpaceMember,
  SpaceSettings,
  SpacePermissions,
  RoomBlueprintInput,
} from './types/space';
export { SpaceVisibility } from './types/space';
export type { SpaceVisibilityType } from './types/space';

export type { IRoom, IRoomObject, MapConfig, InteractionData } from './types/room';
export { RoomType, InteractionType } from './types/room';
export type { RoomTypeValue, InteractionTypeValue } from './types/room';

export type { IAsset, IAvatar, SpriteSheet, AvatarFrameConfig, AnimationFrames } from './types/asset';
export { AssetCategory } from './types/asset';
export type { AssetCategoryType } from './types/asset';

export type { IMessage, MessageAttachment } from './types/message';
export { MessageType, AttachmentType } from './types/message';
export type { MessageTypeValue } from './types/message';

export type { ITask, TaskComment } from './types/task';
export { TaskStatus, TaskPriority } from './types/task';
export type { TaskStatusType, TaskPriorityType } from './types/task';

export type { IInvitation, InvitationNotificationPayload } from './types/invitation';
export { InvitationStatus } from './types/invitation';
export type { InvitationStatusType } from './types/invitation';

export type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerState,
  ChatMessagePayload,
  MediaParticipant,
} from './types/socket-events';
export { Direction } from './types/socket-events';
export type { DirectionType } from './types/socket-events';

export type { ICEServer, ICEConfig } from './types/webrtc';
export type { RTCSessionDescriptionInit, RTCIceCandidateInit } from './types/socket-events';

export type {
  CuratedWorldAsset,
  WorldRenderable,
  FrameRenderable,
  ImageRenderable,
  AssetFootprint,
  RoomSummaryDefinition,
  RoomTemplateKeyType,
} from './world/curated-world';
export {
  CURATED_WORLD_ASSETS,
  CURATED_WORLD_ASSET_MAP,
  CURATED_ROOM_TEMPLATES,
  RoomTemplateKey,
  WorldSheetKey,
  WorldAssetRenderKind,
} from './world/curated-world';

// Constants
export * from './constants/index';
