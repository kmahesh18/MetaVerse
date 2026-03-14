export const SpaceRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  COLLABORATOR: 'collaborator',
  MODERATOR: 'moderator',
  MEMBER: 'member',
  GUEST: 'guest',
} as const;

export type SpaceRoleType = (typeof SpaceRole)[keyof typeof SpaceRole];

export const ROLE_HIERARCHY: Record<SpaceRoleType, number> = {
  [SpaceRole.OWNER]: 100,
  [SpaceRole.ADMIN]: 80,
  [SpaceRole.COLLABORATOR]: 70,
  [SpaceRole.MODERATOR]: 60,
  [SpaceRole.MEMBER]: 40,
  [SpaceRole.GUEST]: 20,
};
