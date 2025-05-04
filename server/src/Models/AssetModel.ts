import { Document, ObjectId } from "mongodb";

export interface IAsset extends Document {
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

// Collection name for reference
export const ASSET_COLLECTION = "assets";

// No schema definition needed with MongoDB
export default { ASSET_COLLECTION };