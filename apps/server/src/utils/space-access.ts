import { Permission, type PermissionType } from '@metaverse/shared';
import { Space } from '../models/Space.js';
import { SpaceMember } from '../models/SpaceMember.js';

export async function getSpaceBySlug(slug: string) {
  return Space.findOne({ slug });
}

export async function getSpaceMember(spaceId: string, userId?: string) {
  if (!userId) return null;
  return SpaceMember.findOne({ spaceId, userId });
}

export function hasPermission(
  member:
    | {
        role: string;
        permissions?: Partial<Record<PermissionType, boolean>>;
      }
    | null
    | undefined,
  permission: PermissionType
): boolean {
  if (!member) return false;
  if (member.role === 'owner' || member.role === 'admin') return true;
  return Boolean(member.permissions?.[permission]);
}

export function canManageRooms(
  member:
    | {
        role: string;
        permissions?: Partial<Record<PermissionType, boolean>>;
      }
    | null
    | undefined
) {
  return hasPermission(member, Permission.CAN_MANAGE_ROOMS);
}

export function canManageMembers(
  member:
    | {
        role: string;
        permissions?: Partial<Record<PermissionType, boolean>>;
      }
    | null
    | undefined
) {
  return hasPermission(member, Permission.CAN_MANAGE_MEMBERS);
}

export function canInvite(
  member:
    | {
        role: string;
        permissions?: Partial<Record<PermissionType, boolean>>;
      }
    | null
    | undefined
) {
  return hasPermission(member, Permission.CAN_INVITE);
}

export function canManageAssets(
  member:
    | {
        role: string;
        permissions?: Partial<Record<PermissionType, boolean>>;
      }
    | null
    | undefined
) {
  return hasPermission(member, Permission.CAN_MANAGE_ASSETS);
}
