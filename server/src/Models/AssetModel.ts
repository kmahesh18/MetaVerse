import { Document, ObjectId } from "mongodb";

export interface IAsset extends Document {
  _id?: ObjectId;
  id: string; // UUID
  assetId: string;
  name: string;
  previewUrl: string;
  createdAt: Date;
}

// Collection name for reference
export const ASSET_COLLECTION = "assets";

// No schema definition needed with MongoDB
export default { ASSET_COLLECTION };
