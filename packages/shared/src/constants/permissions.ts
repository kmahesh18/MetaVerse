export const Permission = {
  CAN_INVITE: 'canInvite',
  CAN_MANAGE_ROOMS: 'canManageRooms',
  CAN_MANAGE_MEMBERS: 'canManageMembers',
  CAN_BROADCAST: 'canBroadcast',
  CAN_MANAGE_ASSETS: 'canManageAssets',
} as const;

export type PermissionType = (typeof Permission)[keyof typeof Permission];

export const DEFAULT_PERMISSIONS: Record<string, Record<PermissionType, boolean>> = {
  owner: {
    canInvite: true,
    canManageRooms: true,
    canManageMembers: true,
    canBroadcast: true,
    canManageAssets: true,
  },
  admin: {
    canInvite: true,
    canManageRooms: true,
    canManageMembers: true,
    canBroadcast: true,
    canManageAssets: true,
  },
  collaborator: {
    canInvite: true,
    canManageRooms: true,
    canManageMembers: true,
    canBroadcast: true,
    canManageAssets: true,
  },
  moderator: {
    canInvite: true,
    canManageRooms: false,
    canManageMembers: false,
    canBroadcast: true,
    canManageAssets: false,
  },
  member: {
    canInvite: false,
    canManageRooms: false,
    canManageMembers: false,
    canBroadcast: false,
    canManageAssets: false,
  },
  guest: {
    canInvite: false,
    canManageRooms: false,
    canManageMembers: false,
    canBroadcast: false,
    canManageAssets: false,
  },
};
