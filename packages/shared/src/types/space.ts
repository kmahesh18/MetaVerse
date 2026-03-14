import type { SpaceRoleType } from '../constants/roles.js';
import type { PermissionType } from '../constants/permissions.js';

export const SpaceVisibility = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  INVITE_ONLY: 'invite-only',
} as const;

export type SpaceVisibilityType = (typeof SpaceVisibility)[keyof typeof SpaceVisibility];

export interface SpaceSettings {
  maxMembers: number;
  allowGuestPreview: boolean;
  defaultRoom?: string;
}

export interface RoomBlueprintInput {
  templateKey: string;
  name: string;
  isDefault?: boolean;
}

export interface ISpace {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  ownerId: string;
  visibility: SpaceVisibilityType;
  settings: SpaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpacePermissions {
  canInvite: boolean;
  canManageRooms: boolean;
  canManageMembers: boolean;
  canBroadcast: boolean;
  canManageAssets: boolean;
}

export interface ISpaceMember {
  _id: string;
  spaceId: string;
  userId: string;
  role: SpaceRoleType;
  permissions: SpacePermissions;
  joinedAt: Date;
  invitedBy?: string;
}

export type { SpaceRoleType, PermissionType };
