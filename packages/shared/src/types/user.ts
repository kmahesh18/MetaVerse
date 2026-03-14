export const UserStatus = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

export interface AvatarConfig {
  spriteIndex: number;
  skinTone?: number;
  outfit?: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  audioEnabled: boolean;
  videoEnabled: boolean;
  volume: number;
}

export interface IUser {
  _id: string;
  email: string;
  displayName: string;
  avatarConfig: AvatarConfig;
  status: UserStatusType;
  lastSeen?: Date;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  _id: string;
  displayName: string;
  avatarConfig: AvatarConfig;
  status: UserStatusType;
}
