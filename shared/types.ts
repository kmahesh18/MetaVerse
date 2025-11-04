// ===================================
// 🔗 Shared Types for Client and Server
// ===================================

// Asset Types
export interface IAsset {
  _id?: string;
  assetId: string;
  name: string;
  previewUrl: string;
  collidable: boolean;
  interactable: boolean;
  posX?: number | null;
  posY?: number | null;
  scale?: number;
  zindex?: number;
}

// Room Type
export interface IRoomType {
  _id?: string;
  name: string;
  description: string;
  id: string;
  assets: IAsset[];
}

// Space Type
export interface ISpace {
  _id?: string;
  id: string; // room id by uuid
  roomids: string[];
  adminid: string;
  activeuserids: string[];
  accessibleuserids: string[];
}

// User Type
export interface IUser {
  _id?: string;
  clerkId: string;
  username: string;
  email?: string;
  avatar?: string;
  spaces?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
